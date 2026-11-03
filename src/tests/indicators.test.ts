import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateRSI, calculateIndicators } from '../lib/indicators';
import { Candle } from '../types/market';

describe('Deterministic Technical Indicators Specification (Phase P3)', () => {
  it('should calculate SMA correctly on known numerical series', () => {
    // Array of 20 numbers from 10 to 29
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    // Average of 10..29 is (10 + 29) / 2 = 19.5
    const sma20 = calculateSMA(closes, 20);
    expect(sma20).toBe(19.5);
  });

  it('should return undefined when closes array has fewer items than SMA period', () => {
    const closes = [100, 102, 104, 106];
    expect(calculateSMA(closes, 20)).toBeUndefined();
    expect(calculateSMA(closes, 50)).toBeUndefined();
    expect(calculateSMA([], 20)).toBeUndefined();
  });

  it('should calculate EMA correctly with proper smoothing multiplier', () => {
    const closes = Array.from({ length: 20 }, () => 100);
    // Flat series of 100 should have EMA of 100
    const ema20 = calculateEMA(closes, 20);
    expect(ema20).toBe(100.0);

    // Monotonically increasing series
    const trendingCloses = Array.from({ length: 25 }, (_, i) => 100 + i * 2);
    const emaTrending = calculateEMA(trendingCloses, 20);
    expect(emaTrending).toBeDefined();
    // EMA gives higher weight to recent prices
    expect(emaTrending).toBeGreaterThan(120);
  });

  it('should calculate RSI(14) as 100 when series has only upward gains', () => {
    // 15 bars with strictly positive changes
    const closes = Array.from({ length: 15 }, (_, i) => 100 + i * 5);
    const rsi = calculateRSI(closes, 14);
    expect(rsi).toBe(100.0);
  });

  it('should calculate RSI(14) near 0 when series has only downward losses', () => {
    // 15 bars with strictly negative changes
    const closes = Array.from({ length: 15 }, (_, i) => 200 - i * 5);
    const rsi = calculateRSI(closes, 14);
    expect(rsi).toBe(0.0);
  });

  it('should handle zero-volatility flat prices by returning neutral 50', () => {
    const flatCloses = Array.from({ length: 20 }, () => 1500.0);
    const rsi = calculateRSI(flatCloses, 14);
    expect(rsi).toBe(50.0);
  });

  it('should return undefined when closes array has fewer than period + 1 for RSI', () => {
    const closes = [100, 105, 110];
    expect(calculateRSI(closes, 14)).toBeUndefined();
    expect(calculateRSI([], 14)).toBeUndefined();
  });

  it('should calculate all indicators bundle correctly from Candle objects', () => {
    // Generate 60 realistic ascending candles
    const candles: Candle[] = Array.from({ length: 60 }, (_, i) => {
      const close = 2000 + i * 10;
      return {
        timestamp: `2026-09-${String(i + 1).padStart(2, '0')}`,
        open: close - 5,
        high: close + 8,
        low: close - 8,
        close,
        volume: 1000000,
      };
    });

    const indicators = calculateIndicators(candles);
    expect(indicators.sma20).toBeDefined();
    expect(indicators.sma50).toBeDefined();
    expect(indicators.ema20).toBeDefined();
    expect(indicators.ema50).toBeDefined();
    expect(indicators.rsi14).toBeDefined();

    // Since prices are steadily increasing:
    // SMA20 of last 20 (prices 2400..2590) > SMA50 of last 50 (prices 2100..2590)
    expect(indicators.sma20!).toBeGreaterThan(indicators.sma50!);
  });
});
