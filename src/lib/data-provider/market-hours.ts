import { DataStatus } from '@/types/market';

/**
 * Indian Equity Market Hours (NSE/BSE)
 * Normal Trading Hours: Monday - Friday, 09:15 to 15:30 IST (Asia/Kolkata, UTC+5:30)
 */
export interface MarketSessionInfo {
  isOpen: boolean;
  sessionState: 'PRE_OPEN' | 'REGULAR' | 'POST_CLOSE' | 'WEEKEND' | 'HOLIDAY';
  istTimeString: string;
  recommendedStatus: DataStatus;
}

export function getIndianMarketSession(currentTime: Date = new Date()): MarketSessionInfo {
  // Convert UTC timestamp to IST (UTC + 5 hours 30 minutes = 19,800,000 ms)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(currentTime.getTime() + IST_OFFSET_MS);

  const dayOfWeek = istDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Format IST time string: YYYY-MM-DDTHH:mm:ss+05:30
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
  const istTimeString = `${year}-${month}-${day}T${hh}:${mm}:${ss}+05:30`;

  if (isWeekend) {
    return {
      isOpen: false,
      sessionState: 'WEEKEND',
      istTimeString,
      recommendedStatus: 'CLOSED',
    };
  }

  // Regular market session: 09:15 (555 min) to 15:30 (930 min)
  const marketOpenMinutes = 9 * 60 + 15; // 555
  const marketCloseMinutes = 15 * 60 + 30; // 930
  const preOpenMinutes = 9 * 60; // 540

  if (timeInMinutes < preOpenMinutes) {
    return {
      isOpen: false,
      sessionState: 'PRE_OPEN',
      istTimeString,
      recommendedStatus: 'CLOSED',
    };
  } else if (timeInMinutes < marketOpenMinutes) {
    return {
      isOpen: false,
      sessionState: 'PRE_OPEN',
      istTimeString,
      recommendedStatus: 'DELAYED',
    };
  } else if (timeInMinutes <= marketCloseMinutes) {
    return {
      isOpen: true,
      sessionState: 'REGULAR',
      istTimeString,
      recommendedStatus: 'LIVE',
    };
  } else {
    return {
      isOpen: false,
      sessionState: 'POST_CLOSE',
      istTimeString,
      recommendedStatus: 'CLOSED',
    };
  }
}

/**
 * Determine data freshness status based on market hours and quote timestamp
 */
export function determineDataStatus(
  quoteTimestamp: string,
  isDemoFixture: boolean = false
): DataStatus {
  if (isDemoFixture) {
    return 'DEMO';
  }

  const session = getIndianMarketSession();

  // If market is currently closed, status is CLOSED
  if (!session.isOpen) {
    return 'CLOSED';
  }

  // During market hours, check freshness
  const quoteDate = new Date(quoteTimestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - quoteDate.getTime()) / (1000 * 60);

  if (diffMinutes > 30) {
    return 'STALE';
  } else if (diffMinutes > 15) {
    return 'DELAYED';
  }

  return 'LIVE';
}
