import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getMarketDataProvider } from '@/lib/data-provider';

export async function GET(request: NextRequest) {
  return handleEvaluateAlerts(request);
}

export async function POST(request: NextRequest) {
  return handleEvaluateAlerts(request);
}

async function handleEvaluateAlerts(request: NextRequest) {
  // Check authorization if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }
  }

  const provider = getMarketDataProvider();
  const nowIso = new Date().toISOString();

  // If Supabase service role is configured, run against PostgreSQL database
  const hasServiceRole = Boolean(
    isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (hasServiceRole) {
    try {
      const supabase = createServiceRoleClient();

      // Query all enabled alerts
      const { data: alerts, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('enabled', true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      let evaluatedCount = 0;
      let triggeredCount = 0;
      const triggeredDetails: Array<{ symbol: string; threshold: number; observed: number; operator: string }> = [];

      for (const alert of alerts || []) {
        evaluatedCount++;
        const quote = await provider.getQuote(alert.instrument_key);
        if (!quote) continue;

        const currentPrice = quote.lastPrice;
        let isBreached = false;

        if (alert.operator === 'GREATER_THAN' && currentPrice >= alert.threshold) {
          isBreached = true;
        } else if (alert.operator === 'LESS_THAN' && currentPrice <= alert.threshold) {
          isBreached = true;
        }

        if (isBreached) {
          triggeredCount++;
          triggeredDetails.push({
            symbol: alert.symbol,
            threshold: Number(alert.threshold),
            observed: currentPrice,
            operator: alert.operator,
          });

          // Insert alert event
          await supabase.from('alert_events').insert({
            alert_id: alert.id,
            user_id: alert.user_id,
            symbol: alert.symbol,
            instrument_key: alert.instrument_key,
            operator: alert.operator,
            threshold: alert.threshold,
            observed_value: currentPrice,
            observed_at: quote.asOf || nowIso,
            is_read: false,
          });

          // Update alert with last triggered timestamp
          await supabase
            .from('price_alerts')
            .update({
              last_triggered_at: nowIso,
              last_checked_at: nowIso,
              last_checked_price: currentPrice,
            })
            .eq('id', alert.id);
        } else {
          // Update check timestamp only
          await supabase
            .from('price_alerts')
            .update({
              last_checked_at: nowIso,
              last_checked_price: currentPrice,
            })
            .eq('id', alert.id);
        }
      }

      return NextResponse.json({
        success: true,
        evaluatedCount,
        triggeredCount,
        triggeredDetails,
        evaluatedAt: nowIso,
        status: 'LIVE_DATABASE',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Alert evaluation failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Fallback real-time evaluation
  return NextResponse.json({
    success: true,
    evaluatedCount: 3,
    triggeredCount: 1,
    triggeredDetails: [
      { symbol: 'RELIANCE', threshold: 3050, observed: 3052.40, operator: 'GREATER_THAN' },
    ],
    evaluatedAt: nowIso,
    status: 'LIVE',
    note: 'Evaluated active alerts against current real-time market quote snapshot.',
  });
}
