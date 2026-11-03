import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { globalPaperPortfolio } from '@/lib/simulation/paper-portfolio';
import { globalRateLimiter, getClientIp } from '@/lib/rate-limiter';

const OrderActionSchema = z.object({
  action: z.literal('ORDER'),
  instrumentKey: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const ResetActionSchema = z.object({
  action: z.literal('RESET'),
  startingCash: z.number().positive().optional().default(500000),
});

const PortfolioPostSchema = z.discriminatedUnion('action', [
  OrderActionSchema,
  ResetActionSchema,
]);

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`portfolio_get:${ip}`, 120, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  const portfolio = globalPaperPortfolio.getPortfolio();
  return NextResponse.json(portfolio, {
    headers: {
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rateLimit = globalRateLimiter.check(`portfolio_post:${ip}`, 60, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry in a few seconds.', retryAfter: rateLimit.reset },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = PortfolioPostSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid portfolio request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === 'RESET') {
      const resetPortfolio = globalPaperPortfolio.reset(payload.startingCash);
      return NextResponse.json({
        success: true,
        message: `Paper portfolio reset to ₹${payload.startingCash.toLocaleString('en-IN')} virtual cash.`,
        portfolio: resetPortfolio,
      });
    }

    const result = globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: payload.instrumentKey,
      symbol: payload.symbol,
      name: payload.name,
      side: payload.side,
      quantity: payload.quantity,
      price: payload.price,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, portfolio: result.portfolio },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Paper portfolio execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
