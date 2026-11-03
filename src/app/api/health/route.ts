import { NextResponse } from 'next/server';
import { getDataProviderStatus, serverCache, getIndianMarketSession } from '@/lib/data-provider';

export async function GET() {
  const providerInfo = getDataProviderStatus();
  const session = getIndianMarketSession();
  const cacheStats = serverCache.getStats();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: {
      type: providerInfo.provider,
      authorized: providerInfo.isAuthorized,
      activeStatus: providerInfo.recommendedStatus,
      description:
        providerInfo.provider === 'UPSTOX'
          ? 'Authorized Upstox Analytics Token API connected with automatic fallback'
          : 'Zero-config real-time market data feed active',
    },
    market: {
      sessionState: session.sessionState,
      isOpen: session.isOpen,
      istTime: session.istTimeString,
    },
    cache: {
      entries: cacheStats.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
    },
    compliance: {
      realMoneyTrading: false,
      paperTradingOnly: true,
      dataAttributionEnforced: true,
    },
  });
}
