import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarketDataProvider, getDataProviderStatus } from '@/lib/data-provider';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

const searchSchema = z.object({
  q: z.string().max(50).optional().default(''),
});

export async function GET(request: NextRequest) {
  // Rate limiting check: 120 req/min per IP
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`search:${ip}`, 120, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = searchSchema.safeParse({
      q: searchParams.get('q') || '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameter', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const query = parsed.data.q;
    const provider = getMarketDataProvider();
    const results = await provider.searchInstruments(query);
    const providerInfo = getDataProviderStatus();

    return NextResponse.json(
      {
        query,
        count: results.length,
        instruments: results,
        status: providerInfo.recommendedStatus,
        source: providerInfo.provider === 'UPSTOX' ? 'Upstox Active Universe' : 'Curated Indian Equity Universe',
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
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
