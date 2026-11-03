import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';
import { AlertRule, AlertEvent } from '@/types/market';

// In-memory active alerts fallback for unauthenticated users or guest sessions
let activeSessionAlerts: AlertRule[] = [
  {
    id: 'alert-reliance-upper',
    userId: 'session-user',
    instrumentKey: 'NSE_EQ|INE002A01018',
    symbol: 'RELIANCE',
    operator: 'GREATER_THAN',
    threshold: 3050,
    enabled: true,
    lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'alert-hdfc-lower',
    userId: 'session-user',
    instrumentKey: 'NSE_EQ|INE040A01034',
    symbol: 'HDFCBANK',
    operator: 'LESS_THAN',
    threshold: 1700,
    enabled: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'alert-tcs-upper',
    userId: 'session-user',
    instrumentKey: 'NSE_EQ|INE467B01029',
    symbol: 'TCS',
    operator: 'GREATER_THAN',
    threshold: 4200,
    enabled: true,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

let activeSessionEvents: AlertEvent[] = [
  {
    id: 'event-reliance-1',
    alertId: 'alert-reliance-upper',
    symbol: 'RELIANCE',
    observedValue: 3052.40,
    observedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const CreateAlertSchema = z.object({
  instrumentKey: z.string().min(1).max(100),
  symbol: z.string().min(1).max(50),
  operator: z.enum(['GREATER_THAN', 'LESS_THAN']),
  threshold: z.number().positive(),
});

const ToggleAlertSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

const DeleteAlertSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`alerts_get:${ip}`, 60, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        alerts: activeSessionAlerts,
        events: activeSessionEvents,
        frequencyNote: 'Alert conditions are evaluated on 5-minute snapshot intervals during Indian market hours.',
        status: 'LIVE',
        note: 'Configure Supabase and sign in to persist alerts permanently across devices.',
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        alerts: activeSessionAlerts,
        events: activeSessionEvents,
        frequencyNote: 'Alert conditions are evaluated on 5-minute snapshot intervals during Indian market hours.',
        status: 'LIVE',
        note: 'Sign in to sync personal alerts permanently across devices.',
      });
    }

    // Fetch alerts for authenticated user
    const { data: dbAlerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('id, instrument_key, symbol, operator, threshold, enabled, last_triggered_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (alertsError) throw new Error(alertsError.message);

    // Fetch recent events for authenticated user
    const { data: dbEvents, error: eventsError } = await supabase
      .from('alert_events')
      .select('id, alert_id, symbol, observed_value, observed_at, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (eventsError) throw new Error(eventsError.message);

    const formattedAlerts: AlertRule[] = (dbAlerts || []).map((a) => ({
      id: a.id,
      userId: user.id,
      instrumentKey: a.instrument_key,
      symbol: a.symbol,
      operator: a.operator,
      threshold: Number(a.threshold),
      enabled: a.enabled,
      lastTriggeredAt: a.last_triggered_at,
      createdAt: a.created_at,
    }));

    const formattedEvents: AlertEvent[] = (dbEvents || []).map((e) => ({
      id: e.id,
      alertId: e.alert_id,
      symbol: e.symbol,
      observedValue: Number(e.observed_value),
      observedAt: e.observed_at,
      createdAt: e.created_at,
    }));

    return NextResponse.json({
      alerts: formattedAlerts,
      events: formattedEvents,
      frequencyNote: 'Alert conditions are evaluated on 5-minute snapshot intervals during Indian market hours.',
      status: 'LIVE',
      userId: user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`alerts_post:${ip}`, 30, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = CreateAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid alert parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { instrumentKey, symbol, operator, threshold } = parsed.data;

    if (!isSupabaseConfigured()) {
      const newAlert: AlertRule = {
        id: `alert-${Date.now()}`,
        userId: 'session-user',
        instrumentKey,
        symbol,
        operator,
        threshold,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      activeSessionAlerts.unshift(newAlert);
      return NextResponse.json({ success: true, alert: newAlert, status: 'LIVE' }, { status: 201 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const newAlert: AlertRule = {
        id: `alert-${Date.now()}`,
        userId: 'session-user',
        instrumentKey,
        symbol,
        operator,
        threshold,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      activeSessionAlerts.unshift(newAlert);
      return NextResponse.json({
        success: true,
        alert: newAlert,
        status: 'LIVE',
        note: 'Alert saved for current session. Sign in to sync across devices.',
      }, { status: 201 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        instrument_key: instrumentKey,
        symbol,
        operator,
        threshold,
        enabled: true,
      })
      .select('id, instrument_key, symbol, operator, threshold, enabled, created_at')
      .single();

    if (insertError) throw new Error(insertError.message);

    const formatted: AlertRule = {
      id: inserted.id,
      userId: user.id,
      instrumentKey: inserted.instrument_key,
      symbol: inserted.symbol,
      operator: inserted.operator,
      threshold: Number(inserted.threshold),
      enabled: inserted.enabled,
      createdAt: inserted.created_at,
    };

    return NextResponse.json({ success: true, alert: formatted, status: 'LIVE' }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ToggleAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'id and enabled boolean are required' }, { status: 400 });
    }

    const { id, enabled } = parsed.data;

    if (!isSupabaseConfigured()) {
      activeSessionAlerts = activeSessionAlerts.map((a) => (a.id === id ? { ...a, enabled } : a));
      return NextResponse.json({ success: true, alerts: activeSessionAlerts });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      activeSessionAlerts = activeSessionAlerts.map((a) => (a.id === id ? { ...a, enabled } : a));
      return NextResponse.json({ success: true, alerts: activeSessionAlerts });
    }

    const { error } = await supabase
      .from('price_alerts')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, id, enabled });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = DeleteAlertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { id } = parsed.data;

    if (!isSupabaseConfigured()) {
      activeSessionAlerts = activeSessionAlerts.filter((a) => a.id !== id);
      return NextResponse.json({ success: true, id });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      activeSessionAlerts = activeSessionAlerts.filter((a) => a.id !== id);
      return NextResponse.json({ success: true, id });
    }

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
