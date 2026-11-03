import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarketDataProvider, getDataProviderStatus } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

const querySchema = z.object({
  days: z.coerce.number().min(5).max(365).default(60),
});

export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ key: string }> }
) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`history:${ip}`, 120, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const { key } = await segmentData.params;
    if (!key || key.length > 100) {
      return NextResponse.json({ error: 'Invalid instrument key parameter' }, { status: 400 });
    }

    const decodedKey = decodeURIComponent(key);
    const searchParams = request.nextUrl.searchParams;
    const parsedQuery = querySchema.safeParse({
      days: searchParams.get('days') || 60,
    });
    const days = parsedQuery.success ? parsedQuery.data.days : 60;

    const provider = getMarketDataProvider();
    const instrument = await provider.getInstrument(decodedKey);

    if (!instrument) {
      return NextResponse.json(
        { error: `Instrument not found: ${decodedKey}`, status: 'CLOSED' },
        { status: 404 }
      );
    }

    const candles = await provider.getHistoricalCandles(instrument.instrumentKey, days);
    const providerInfo = getDataProviderStatus();

    return NextResponse.json(
      {
        instrumentKey: instrument.instrumentKey,
        symbol: instrument.symbol,
        interval: '1D',
        count: candles.length,
        candles,
        source: providerInfo.provider === 'UPSTOX' ? 'Upstox Historical Daily API' : 'NSE/BSE Historical Daily Feed',
        status: providerInfo.recommendedStatus,
        asOf: providerInfo.asOf,
      },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
