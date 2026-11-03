import { describe, it, expect } from 'vitest';
import { getIndianMarketSession, determineDataStatus } from '../lib/data-provider/market-hours';

describe('Market Hours & Data Status Specification', () => {
  it('should identify Sunday as WEEKEND and CLOSED', () => {
    // 2026-11-01 is a Sunday
    const sundayDate = new Date('2026-11-01T12:00:00Z');
    const session = getIndianMarketSession(sundayDate);

    expect(session.isOpen).toBe(false);
    expect(session.sessionState).toBe('WEEKEND');
    expect(session.recommendedStatus).toBe('CLOSED');
  });

  it('should identify a Wednesday at 11:30 AM IST as REGULAR and LIVE', () => {
    // 2026-10-28 is a Wednesday. 11:30 AM IST = 06:00 AM UTC
    const tradingHoursDate = new Date('2026-10-28T06:00:00Z');
    const session = getIndianMarketSession(tradingHoursDate);

    expect(session.isOpen).toBe(true);
    expect(session.sessionState).toBe('REGULAR');
    expect(session.recommendedStatus).toBe('LIVE');
  });

  it('should identify a Wednesday at 07:00 PM IST as POST_CLOSE and CLOSED', () => {
    // 2026-10-28 19:00 IST = 13:30 UTC
    const postCloseDate = new Date('2026-10-28T13:30:00Z');
    const session = getIndianMarketSession(postCloseDate);

    expect(session.isOpen).toBe(false);
    expect(session.sessionState).toBe('POST_CLOSE');
    expect(session.recommendedStatus).toBe('CLOSED');
  });

  it('should return DEMO for demo fixtures regardless of time', () => {
    const status = determineDataStatus('2026-10-30T15:30:00+05:30', true);
    expect(status).toBe('DEMO');
  });
});
