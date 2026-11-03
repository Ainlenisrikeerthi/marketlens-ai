import { NextRequest, NextResponse } from 'next/server';
import { getMarketDataProvider, getDataProviderStatus } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`news:${ip}`, 120, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const instrument = searchParams.get('instrument') || undefined;

    const provider = getMarketDataProvider();
    const news = await provider.getNews(instrument);
    const providerInfo = getDataProviderStatus();

    return NextResponse.json(
      {
        instrument: instrument || 'ALL',
        count: news.length,
        news,
        status: providerInfo.recommendedStatus,
        source: providerInfo.provider === 'UPSTOX' ? 'Upstox Financial Wire API' : 'NSE/BSE Financial News Wire',
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
    const message = err instanceof Error ? err.message : 'Failed to retrieve news';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
