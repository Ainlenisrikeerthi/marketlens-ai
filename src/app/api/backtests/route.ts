import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarketDataProvider } from '@/lib/data-provider';

import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

const BacktestInputSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  strategy: z.enum(['SMA_CROSSOVER', 'RSI_THRESHOLD']),
  startDate: z.string().optional().default('2026-08-01'),
  endDate: z.string().optional().default('2026-10-30'),
  startingCapital: z.number().positive().default(500000),
  positionSizePercent: z.number().min(10).max(100).default(100),
  estimatedFeePercent: z.number().min(0).max(5).default(0.1),
  estimatedSlippagePercent: z.number().min(0).max(5).default(0.05),
  smaFast: z.number().int().min(2).max(50).optional().default(10),
  smaSlow: z.number().int().min(5).max(200).optional().default(20),
  rsiOversold: z.number().min(10).max(50).optional().default(35),
  rsiOverbought: z.number().min(50).max(90).optional().default(65),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`backtest:${ip}`, 30, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = BacktestInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid backtest parameters',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const provider = getMarketDataProvider();
    const result = await provider.runBacktest(parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backtest execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
