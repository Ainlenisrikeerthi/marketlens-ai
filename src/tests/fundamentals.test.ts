import { describe, it, expect } from 'vitest';
import { getCompanyFundamentals, COMPANY_FUNDAMENTALS } from '../lib/data-provider/fundamentals';

describe('Company Fundamentals Module', () => {
  it('contains fundamental data for all 20 tracked equities', () => {
    const keys = Object.keys(COMPANY_FUNDAMENTALS);
    expect(keys.length).toBe(20);
  });

  it('returns valid fundamentals for RELIANCE', () => {
    const rel = getCompanyFundamentals('NSE_EQ|INE002A01018');
    expect(rel).not.toBeNull();
    expect(rel?.marketCapCr).toBeGreaterThan(1000000);
    expect(rel?.peRatio).toBeGreaterThan(0);
    expect(rel?.yearHigh).toBeGreaterThan(rel?.yearLow || 0);
    expect(rel?.sector).toContain('Oil & Gas');
  });

  it('returns null for unindexed or index instruments', () => {
    const indexData = getCompanyFundamentals('NSE_INDEX|Nifty 50');
    expect(indexData).toBeNull();
    const unknown = getCompanyFundamentals('NON_EXISTENT_KEY');
    expect(unknown).toBeNull();
  });

  it('ensures all 20 equities have valid valuation metrics and positive values', () => {
    for (const [key, fund] of Object.entries(COMPANY_FUNDAMENTALS)) {
      expect(fund.marketCapCr, `${key} marketCapCr`).toBeGreaterThan(0);
      expect(fund.peRatio, `${key} peRatio`).toBeGreaterThan(0);
      expect(fund.pbRatio, `${key} pbRatio`).toBeGreaterThan(0);
      expect(fund.yearHigh, `${key} yearHigh`).toBeGreaterThan(fund.yearLow);
      expect(fund.faceValue, `${key} faceValue`).toBeGreaterThan(0);
    }
  });
});
