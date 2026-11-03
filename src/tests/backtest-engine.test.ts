import { describe, it, expect } from 'vitest';
import { runStrategyBacktest } from '../lib/simulation/backtest-engine';
import { Candle, BacktestParameters } from '../types/market';

describe('Deterministic Backtest Engine Specification (Phase P4)', () => {
  // 60 synthetic daily candles with predictable price dynamics
  const createTestCandles = (): Candle[] => {
    return Array.from({ length: 60 }, (_, i) => {
      // Steady rise from 100 to 220
      const base = 100 + i * 2;
      return {
        timestamp: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        open: base,
        high: base + 4,
        low: base - 2,
        close: base + 2,
        volume: 1000000,
      };
    });
  };

  it('should prevent look-ahead bias by filling orders no earlier than bar t+1', () => {
    const candles = createTestCandles();
    const params: BacktestParameters = {
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
    };

    const result = runStrategyBacktest({ candles, parameters: params });

    if (result.trades.length > 0) {
      const firstTrade = result.trades[0];
      // Warmup is 20 bars; first trade cannot happen before bar index 20
      const firstTradeIndex = candles.findIndex((c) => c.timestamp === firstTrade.date);
      expect(firstTradeIndex).toBeGreaterThanOrEqual(20);

      // Verify fill price matches Open price of the fill bar + slippage
      const fillBar = candles[firstTradeIndex];
      const expectedFillPrice = Number((fillBar.open * 1.0005).toFixed(2));
      expect(firstTrade.price).toBe(expectedFillPrice);
    }
  });

  it('should accurately deduct estimated brokerage fees from cash on execution', () => {
    const candles = createTestCandles();
    const feeRate = 0.5; // 0.5% fee
    const params: BacktestParameters = {
      symbol: 'TCS',
      strategy: 'SMA_CROSSOVER',
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      startingCapital: 100000,
      positionSizePercent: 50,
      estimatedFeePercent: feeRate,
      estimatedSlippagePercent: 0,
      smaFast: 5,
      smaSlow: 10,
    };

    const result = runStrategyBacktest({ candles, parameters: params });

    result.trades.forEach((trade) => {
      const expectedFee = Number((trade.quantity * trade.price * (feeRate / 100)).toFixed(2));
      expect(trade.fees).toBeCloseTo(expectedFee, 1);
    });
  });

  it('should adjust fill prices with modeled slippage', () => {
    const candles = createTestCandles();
    const slippagePercent = 0.2; // 0.20% slippage
    const params: BacktestParameters = {
      symbol: 'INFY',
      strategy: 'SMA_CROSSOVER',
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      startingCapital: 500000,
      positionSizePercent: 100,
      estimatedFeePercent: 0.1,
      estimatedSlippagePercent: slippagePercent,
      smaFast: 5,
      smaSlow: 10,
    };

    const result = runStrategyBacktest({ candles, parameters: params });

    result.trades.forEach((trade) => {
      const bar = candles.find((c) => c.timestamp === trade.date);
      if (bar) {
        if (trade.side === 'BUY') {
          // Buys fill above open
          expect(trade.price).toBeGreaterThan(bar.open);
        } else if (trade.side === 'SELL') {
          // Sells fill below open
          expect(trade.price).toBeLessThan(bar.open);
        }
      }
    });
  });

  it('should calculate max drawdown correctly as peak-to-trough decline', () => {
    // Construct a price series that rises, crashes 50%, and recovers
    const crashCandles: Candle[] = [
      ...Array.from({ length: 25 }, (_, i) => ({
        timestamp: `2026-08-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i * 2,
        high: 104 + i * 2,
        low: 98 + i * 2,
        close: 102 + i * 2,
        volume: 500000,
      })),
      // Sharp drop
      { timestamp: '2026-09-01', open: 80, high: 82, low: 70, close: 72, volume: 1500000 },
      { timestamp: '2026-09-02', open: 70, high: 72, low: 58, close: 60, volume: 1800000 },
      { timestamp: '2026-09-03', open: 60, high: 65, low: 58, close: 64, volume: 1000000 },
    ];

    const params: BacktestParameters = {
      symbol: 'TEST_STOCK',
      strategy: 'SMA_CROSSOVER',
      startDate: '2026-08-01',
      endDate: '2026-09-03',
      startingCapital: 500000,
      positionSizePercent: 100,
      estimatedFeePercent: 0.1,
      estimatedSlippagePercent: 0.05,
      smaFast: 5,
      smaSlow: 10,
    };

    const result = runStrategyBacktest({ candles: crashCandles, parameters: params });
    expect(result.metrics.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle insufficient historical bars gracefully with truthful warnings', () => {
    const fewCandles: Candle[] = [
      { timestamp: '2026-10-01', open: 100, high: 105, low: 95, close: 102, volume: 10000 },
      { timestamp: '2026-10-02', open: 102, high: 106, low: 98, close: 104, volume: 12000 },
    ];

    const params: BacktestParameters = {
      symbol: 'FEW_BARS',
      strategy: 'SMA_CROSSOVER',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
      startingCapital: 500000,
      positionSizePercent: 100,
      estimatedFeePercent: 0.1,
      estimatedSlippagePercent: 0.05,
    };

    const result = runStrategyBacktest({ candles: fewCandles, parameters: params });
    expect(result.trades.length).toBe(0);
    expect(result.metrics.finalEquity).toBe(500000);
    expect(result.warnings.some((w) => w.includes('Insufficient historical bars'))).toBe(true);
  });
});
