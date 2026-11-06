"""
Technical indicators: SMA, EMA, RSI.
Port of indicators.ts.
"""

import math


def calculate_sma(closes, period):
    """
    Calculates Simple Moving Average (SMA) for a given series of closing prices.
    Returns None if there are insufficient data points.
    """
    if not closes or len(closes) < period or period <= 0:
        return None
    slice_ = closes[-period:]
    total = sum(slice_)
    return round(total / period, 2)


def calculate_ema(closes, period):
    """
    Calculates Exponential Moving Average (EMA) for a given series of closing prices.
    Uses standard multiplier: k = 2 / (period + 1).
    Returns None if there are insufficient data points.
    """
    if not closes or len(closes) < period or period <= 0:
        return None
    k = 2 / (period + 1)
    # Seed EMA with the first price
    ema = closes[0]
    for i in range(1, len(closes)):
        ema = closes[i] * k + ema * (1 - k)
    return round(ema, 2)


def calculate_rsi(closes, period=14):
    """
    Calculates Relative Strength Index (RSI) using standard RS.
    Default period is 14 bars.
    Returns 50 when price movement has zero volatility (flat series).
    Returns None if closes array has fewer than (period + 1) items.
    """
    if not closes or len(closes) < period + 1 or period <= 0:
        return None

    gains = 0.0
    losses = 0.0

    # Calculate changes over the specified trailing period
    relevant_closes = closes[-(period + 1):]
    for i in range(1, len(relevant_closes)):
        diff = relevant_closes[i] - relevant_closes[i - 1]
        if diff > 0:
            gains += diff
        else:
            losses += abs(diff)

    # Zero volatility edge case
    if gains == 0 and losses == 0:
        return 50.0

    avg_gain = gains / period
    avg_loss = losses / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - 100 / (1 + rs)
    return round(rsi, 2)


def calculate_indicators(candles):
    """
    Computes all canonical technical indicators from OHLCV candles.
    """
    if not candles:
        return {}

    closes = [c['close'] for c in candles if isinstance(c.get('close'), (int, float)) and not math.isnan(c['close'])]

    return {
        'sma20': calculate_sma(closes, 20),
        'sma50': calculate_sma(closes, 50),
        'ema20': calculate_ema(closes, 20),
        'ema50': calculate_ema(closes, 50),
        'rsi14': calculate_rsi(closes, 14),
    }
