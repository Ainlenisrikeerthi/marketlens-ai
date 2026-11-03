import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getMarketDataProvider } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

const AddItemSchema = z.object({
  instrumentKey: z.string().min(1).max(100),
  symbol: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  exchange: z.enum(['NSE', 'BSE', 'INDEX']),
});

const RemoveItemSchema = z.object({
  instrumentKey: z.string().min(1),
  watchlistId: z.string().uuid(),
});

async function getOrCreateDefaultWatchlist(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  // Check if user has a default watchlist
  const { data: existing } = await supabase
    .from('watchlists')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (existing) return existing;

  // Create default watchlist
  const { data: created, error } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, name: 'My Watchlist' })
    .select('id, name')
    .single();

  if (error) throw new Error('Failed to create default watchlist');
  return created;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`watchlist:${ip}`, 60, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const provider = getMarketDataProvider();
      const defaultKeys = [
        'NSE_EQ|INE002A01018',
        'NSE_EQ|INE467B01029',
        'NSE_EQ|INE040A01034',
        'NSE_EQ|INE397D01024',
      ];
      const instruments = (await provider.getAllInstruments()).filter((i) =>
        defaultKeys.includes(i.instrumentKey)
      );
      const quotes = await provider.getQuotes(defaultKeys);
      return NextResponse.json({
        id: 'default-watchlist',
        name: 'Primary Watchlist',
        userId: null,
        items: instruments,
        quotes,
        status: 'LIVE',
        note: 'Sign in to customize and sync your personal watchlist across devices.',
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If no Supabase user, return primary watchlist
    if (!user) {
      const provider = getMarketDataProvider();
      const defaultKeys = [
        'NSE_EQ|INE002A01018',
        'NSE_EQ|INE467B01029',
        'NSE_EQ|INE040A01034',
        'NSE_EQ|INE397D01024',
      ];
      const instruments = (await provider.getAllInstruments()).filter((i) =>
        defaultKeys.includes(i.instrumentKey)
      );
      const quotes = await provider.getQuotes(defaultKeys);
      return NextResponse.json({
        id: 'default-watchlist',
        name: 'Primary Watchlist',
        userId: null,
        items: instruments,
        quotes,
        status: 'LIVE',
        note: 'Sign in to save and personalize your own watchlist permanently.',
      });
    }

    const watchlist = await getOrCreateDefaultWatchlist(supabase, user.id);

    // Get watchlist items
    const { data: items, error: itemsError } = await supabase
      .from('watchlist_items')
      .select('instrument_key, symbol, name, exchange, added_at')
      .eq('watchlist_id', watchlist.id)
      .order('added_at', { ascending: true });

    if (itemsError) throw new Error(itemsError.message);

    // Fetch latest quotes for all items
    const instrumentKeys = (items || []).map((i) => i.instrument_key);
    const provider = getMarketDataProvider();
    const quotes = instrumentKeys.length > 0 ? await provider.getQuotes(instrumentKeys) : [];

    const mappedItems = (items || []).map((item) => ({
      instrumentKey: item.instrument_key,
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      currency: 'INR' as const,
      addedAt: item.added_at,
    }));

    return NextResponse.json({
      id: watchlist.id,
      name: watchlist.name,
      userId: user.id,
      items: mappedItems,
      quotes,
      status: 'LIVE',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch watchlist';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`watchlist_write:${ip}`, 30, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured yet. Sign in or configure database to persist watchlists.', requiresAuth: true },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to save to watchlist.', requiresAuth: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = AddItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid instrument data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const watchlist = await getOrCreateDefaultWatchlist(supabase, user.id);
    const { instrumentKey, symbol, name, exchange } = parsed.data;

    const { error: insertError } = await supabase
      .from('watchlist_items')
      .upsert(
        {
          watchlist_id: watchlist.id,
          user_id: user.id,
          instrument_key: instrumentKey,
          symbol,
          name,
          exchange,
        },
        { onConflict: 'watchlist_id,instrument_key' }
      );

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json(
      { success: true, instrumentKey, watchlistId: watchlist.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add to watchlist';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RemoveItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { instrumentKey, watchlistId } = parsed.data;

    // Verify ownership — RLS will also enforce this
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('instrument_key', instrumentKey)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, instrumentKey });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove from watchlist';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
