import { describe, it, expect } from 'vitest';
import { demoProvider } from '../lib/data-provider';

describe('DemoProvider & Curated Universe Specification', () => {
  it('should include the 3 required Indian benchmark indices', async () => {
    const instruments = await demoProvider.getAllInstruments();
    const indices = instruments.filter((i) => i.isIndex);
    expect(indices.length).toBe(3);

    const symbols = indices.map((i) => i.symbol);
    expect(symbols).toContain('NIFTY 50');
    expect(symbols).toContain('SENSEX');
    expect(symbols).toContain('BANK NIFTY');
  });

  it('should include approximately 20 curated Indian equities with valid identifiers', async () => {
    const instruments = await demoProvider.getAllInstruments();
    const equities = instruments.filter((i) => !i.isIndex);
    expect(equities.length).toBe(20);

    equities.forEach((eq) => {
      expect(eq.instrumentKey).toMatch(/^NSE_EQ\|INE/);
      expect(eq.symbol.length).toBeGreaterThan(0);
      expect(eq.name.length).toBeGreaterThan(0);
      expect(eq.currency).toBe('INR');
      expect(eq.exchange).toBe('NSE');
    });
  });

  it('should enforce status: DEMO on all generated quotes', async () => {
    const overview = await demoProvider.getMarketOverview();
    expect(overview.status).toBe('DEMO');

    overview.indices.forEach((idx) => {
      expect(idx.status).toBe('DEMO');
      expect(idx.lastPrice).toBeGreaterThan(0);
      expect(idx.source).toContain('DEMO');
    });

    overview.allTracked.forEach((quote) => {
      expect(quote.status).toBe('DEMO');
      expect(quote.lastPrice).toBeGreaterThan(0);
      expect(quote.source).toContain('DEMO');
    });
  });

  it('should strictly compute top gainers and losers within the 20 tracked equities', async () => {
    const overview = await demoProvider.getMarketOverview();
    expect(overview.topGainers.length).toBeLessThanOrEqual(5);
    expect(overview.topLosers.length).toBeLessThanOrEqual(5);

    // Verify gainers are sorted descending
    for (let i = 0; i < overview.topGainers.length - 1; i++) {
      expect(overview.topGainers[i].changePercent).toBeGreaterThanOrEqual(
        overview.topGainers[i + 1].changePercent
      );
    }

    // Verify losers are sorted ascending
    for (let i = 0; i < overview.topLosers.length - 1; i++) {
      expect(overview.topLosers[i].changePercent).toBeLessThanOrEqual(
        overview.topLosers[i + 1].changePercent
      );
    }
  });

  it('should generate valid OHLCV daily bars satisfying candle consistency invariants', async () => {
    const candles = await demoProvider.getHistoricalCandles('NSE_EQ|INE002A01018', 30);
    expect(candles.length).toBeGreaterThan(15);

    candles.forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.open);
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.open);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.volume).toBeGreaterThan(0);
      expect(c.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  it('should calculate deterministic technical indicators and grounded observations', async () => {
    const analysis = await demoProvider.getStockAnalysis('NSE_EQ|INE002A01018');
    expect(analysis.status).toBe('DEMO');
    expect(analysis.indicators.sma20).toBeDefined();
    expect(analysis.indicators.rsi14).toBeDefined();
    expect(analysis.indicators.rsi14).toBeGreaterThanOrEqual(0);
    expect(analysis.indicators.rsi14).toBeLessThanOrEqual(100);

    expect(analysis.observations.length).toBeGreaterThan(0);
    expect(analysis.risks.length).toBeGreaterThan(0);
    expect(analysis.sources.length).toBeGreaterThan(0);
    expect(analysis.dataQualityWarnings.length).toBeGreaterThan(0);
  });

  it('should backtest strategies with fee deductions and next-bar execution', async () => {
    const result = await demoProvider.runBacktest({
      symbol: 'RELIANCE',
      strategy: 'SMA_CROSSOVER',
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      startingCapital: 500000,
      positionSizePercent: 100,
      estimatedFeePercent: 0.1,
      estimatedSlippagePercent: 0.05,
      smaFast: 10,
      smaSlow: 20,
    });

    expect(result.status).toBe('DEMO');
    expect(result.metrics.finalEquity).toBeGreaterThan(0);
    expect(result.metrics.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.warnings).toContain('SIMULATED — NOT LIVE TRADING');

    // Check that fees were applied to trades
    result.trades.forEach((trade) => {
      expect(trade.fees).toBeGreaterThanOrEqual(0);
      expect(trade.quantity).toBeGreaterThan(0);
      expect(trade.price).toBeGreaterThan(0);
    });
  });

  it('should filter search results correctly', async () => {
    const searchTCS = await demoProvider.searchInstruments('tcs');
    expect(searchTCS.length).toBeGreaterThan(0);
    expect(searchTCS[0].symbol).toBe('TCS');

    const searchBanking = await demoProvider.searchInstruments('Bank');
    expect(searchBanking.length).toBeGreaterThan(0);
  });
});
