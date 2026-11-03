import { NextRequest, NextResponse } from 'next/server';
import { getMarketDataProvider } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`overview:${ip}`, 120, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const provider = getMarketDataProvider();
    const overview = await provider.getMarketOverview();
    return NextResponse.json(overview, {
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch market overview';
    return NextResponse.json(
      { error: message, status: 'STALE' },
      { status: 500 }
    );
  }
}
