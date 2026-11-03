import { Candle, TechnicalIndicators } from '@/types/market';

/**
 * Calculates Simple Moving Average (SMA) for a given series of closing prices.
 * Returns undefined if there are insufficient data points.
 */
export function calculateSMA(closes: number[], period: number): number | undefined {
  if (!closes || closes.length < period || period <= 0) {
    return undefined;
  }
  const slice = closes.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / period).toFixed(2));
}

/**
 * Calculates Exponential Moving Average (EMA) for a given series of closing prices.
 * Uses standard multiplier: k = 2 / (period + 1).
 * Returns undefined if there are insufficient data points.
 */
export function calculateEMA(closes: number[], period: number): number | undefined {
  if (!closes || closes.length < period || period <= 0) {
    return undefined;
  }
  const k = 2 / (period + 1);
  // Seed EMA with the first price
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(2));
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's smoothed method or standard RS.
 * Default period is 14 bars.
 * Returns 50 when price movement has zero volatility (flat series).
 * Returns undefined if closes array has fewer than (period + 1) items.
 */
export function calculateRSI(closes: number[], period: number = 14): number | undefined {
  if (!closes || closes.length < period + 1 || period <= 0) {
    return undefined;
  }

  let gains = 0;
  let losses = 0;

  // Calculate changes over the specified trailing period
  const relevantCloses = closes.slice(-(period + 1));
  for (let i = 1; i < relevantCloses.length; i++) {
    const diff = relevantCloses[i] - relevantCloses[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  // Zero volatility edge case
  if (gains === 0 && losses === 0) {
    return 50.0;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100.0;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

/**
 * Computes all canonical technical indicators from OHLCV candles.
 */
export function calculateIndicators(candles: Candle[]): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    return {};
  }

  const closes = candles.map((c) => c.close).filter((p) => typeof p === 'number' && !isNaN(p));

  return {
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    rsi14: calculateRSI(closes, 14),
  };
}
