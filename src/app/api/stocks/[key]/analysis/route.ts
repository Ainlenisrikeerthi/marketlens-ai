import { NextRequest, NextResponse } from 'next/server';
import { getMarketDataProvider, getDataProviderStatus } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

export async function GET(
  request: NextRequest,
  segmentData: { params: Promise<{ key: string }> }
) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`analysis:${ip}`, 120, 60_000);
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
    const provider = getMarketDataProvider();
    const instrument = await provider.getInstrument(decodedKey);

    if (!instrument) {
      const providerInfo = getDataProviderStatus();
      return NextResponse.json(
        { error: `Instrument not found: ${decodedKey}`, status: providerInfo.recommendedStatus },
        { status: 404 }
      );
    }

    const analysis = await provider.getStockAnalysis(instrument.instrumentKey);
    return NextResponse.json(analysis, {
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis calculation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
