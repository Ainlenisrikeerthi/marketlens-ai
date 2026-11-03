import {
  Candle,
  BacktestParameters,
  BacktestResult,
  BacktestTrade,
  EquityCurvePoint,
} from '@/types/market';
import { calculateRSI, calculateSMA } from '../indicators';

export interface BacktestEngineOptions {
  candles: Candle[];
  parameters: BacktestParameters;
}

/**
 * Deterministic Backtest Engine strictly preventing look-ahead bias (SOW Section 3 M4).
 * 
 * Rules:
 * 1. Signals are computed strictly using OHLCV data available up to the close of bar t.
 * 2. Order fills are executed no earlier than the open of bar t+1.
 * 3. Buy fill price = Open(t+1) * (1 + slippagePercent / 100).
 * 4. Sell fill price = Open(t+1) * (1 - slippagePercent / 100).
 * 5. Estimated transaction fees (brokerage, STT, exchange charges) are deducted on both entries and exits.
 * 6. Cash and position accounting maintains continuous balance conservation.
 */
export function runStrategyBacktest(options: BacktestEngineOptions): BacktestResult {
  const { candles, parameters } = options;
  const startingCapital = parameters.startingCapital || 500000;
  const feePercent = (parameters.estimatedFeePercent ?? 0.1) / 100;
  const slippagePercent = (parameters.estimatedSlippagePercent ?? 0.05) / 100;
  const positionSizePercent = (parameters.positionSizePercent ?? 100) / 100;

  const warnings: string[] = [
    'SIMULATED — NOT LIVE TRADING',
    'Simulated results incorporate next-bar execution modeling, fee deductions, and slippage.',
    'Past simulated performance does not guarantee future live returns in Indian equity markets.',
  ];

  if (!candles || candles.length < 25) {
    return {
      parameters,
      trades: [],
      equityCurve: [],
      metrics: {
        totalReturnPercent: 0,
        benchmarkReturnPercent: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRatePercent: 0,
        maxDrawdownPercent: 0,
        finalEquity: startingCapital,
      },
      benchmark: {
        symbol: parameters.symbol,
        buyAndHoldFinalEquity: startingCapital,
        totalReturnPercent: 0,
      },
      warnings: ['Insufficient historical bars to compute indicator warmup period (minimum 25 bars required).'],
      status: 'LIVE',
    };
  }

  let cash = startingCapital;
  let shares = 0;
  let peakEquity = startingCapital;
  let maxDrawdown = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityCurvePoint[] = [];

  const closes = candles.map((c) => c.close);
  const benchmarkStartPrice = candles[0].close;
  const benchmarkUnits = startingCapital / benchmarkStartPrice;

  let pendingSignal: 'BUY' | 'SELL' | null = null;
  let pendingReason = '';

  const warmupBars = parameters.strategy === 'SMA_CROSSOVER'
    ? Math.max(parameters.smaSlow || 20, 20)
    : 16;

  for (let i = 0; i < candles.length; i++) {
    const currentBar = candles[i];

    // 1. EXECUTE PENDING SIGNAL from yesterday's bar close at today's open price
    if (pendingSignal === 'BUY' && cash > 1000) {
      const fillPrice = Number((currentBar.open * (1 + slippagePercent)).toFixed(2));
      const targetAllocation = startingCapital * positionSizePercent;
      const deployableCash = Math.min(cash, targetAllocation);
      const qty = Math.floor(deployableCash / fillPrice);

      if (qty > 0) {
        const principal = qty * fillPrice;
        const fee = Number((principal * feePercent).toFixed(2));
        const totalOutlay = principal + fee;

        if (cash >= totalOutlay) {
          cash = Number((cash - totalOutlay).toFixed(2));
          shares += qty;

          trades.push({
            id: `trade-${trades.length + 1}`,
            date: currentBar.timestamp,
            symbol: parameters.symbol,
            side: 'BUY',
            quantity: qty,
            price: fillPrice,
            fees: fee,
            reason: pendingReason,
          });
        }
      }
      pendingSignal = null;
    } else if (pendingSignal === 'SELL' && shares > 0) {
      const fillPrice = Number((currentBar.open * (1 - slippagePercent)).toFixed(2));
      const grossRevenue = shares * fillPrice;
      const fee = Number((grossRevenue * feePercent).toFixed(2));
      const netRevenue = Number((grossRevenue - fee).toFixed(2));

      // Calculate Net PnL based on previous buy trade
      const lastBuy = [...trades].reverse().find((t) => t.side === 'BUY');
      const costBasis = lastBuy ? lastBuy.price * shares + lastBuy.fees : 0;
      const netPnl = Number((netRevenue - costBasis).toFixed(2));

      cash = Number((cash + netRevenue).toFixed(2));

      trades.push({
        id: `trade-${trades.length + 1}`,
        date: currentBar.timestamp,
        symbol: parameters.symbol,
        side: 'SELL',
        quantity: shares,
        price: fillPrice,
        fees: fee,
        netPnl,
        reason: pendingReason,
      });

      shares = 0;
      pendingSignal = null;
    }

    // 2. MARK-TO-MARKET PORTFOLIO VALUE AT CLOSE OF CURRENT BAR
    const currentHoldingsValue = shares * currentBar.close;
    const currentTotalEquity = Number((cash + currentHoldingsValue).toFixed(2));
    const benchmarkEquity = Number((benchmarkUnits * currentBar.close).toFixed(2));

    if (currentTotalEquity > peakEquity) {
      peakEquity = currentTotalEquity;
    }
    const currentDrawdown = peakEquity > 0
      ? Number((((peakEquity - currentTotalEquity) / peakEquity) * 100).toFixed(2))
      : 0;

    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    equityCurve.push({
      date: currentBar.timestamp,
      equity: currentTotalEquity,
      benchmarkEquity: benchmarkEquity,
    });

    // 3. EVALUATE STRATEGY SIGNALS AT CLOSE OF BAR (to be executed on bar t+1)
    if (i >= warmupBars && i < candles.length - 1) {
      const historicalSlice = closes.slice(0, i + 1);

      if (parameters.strategy === 'SMA_CROSSOVER') {
        const fastP = parameters.smaFast || 10;
        const slowP = parameters.smaSlow || 20;

        const fastSMA = calculateSMA(historicalSlice, fastP);
        const slowSMA = calculateSMA(historicalSlice, slowP);

        if (fastSMA !== undefined && slowSMA !== undefined) {
          if (fastSMA > slowSMA && shares === 0) {
            pendingSignal = 'BUY';
            pendingReason = `SMA(${fastP}) crossed above SMA(${slowP}) [₹${fastSMA} > ₹${slowSMA}]`;
          } else if (fastSMA < slowSMA && shares > 0) {
            pendingSignal = 'SELL';
            pendingReason = `SMA(${fastP}) crossed below SMA(${slowP}) [₹${fastSMA} < ₹${slowSMA}]`;
          }
        }
      } else {
        // RSI THRESHOLD STRATEGY
        const oversold = parameters.rsiOversold || 35;
        const overbought = parameters.rsiOverbought || 65;
        const rsi = calculateRSI(historicalSlice, 14);

        if (rsi !== undefined) {
          if (rsi <= oversold && shares === 0) {
            pendingSignal = 'BUY';
            pendingReason = `14-day RSI oversold trigger (${rsi} ≤ ${oversold})`;
          } else if (rsi >= overbought && shares > 0) {
            pendingSignal = 'SELL';
            pendingReason = `14-day RSI overbought trigger (${rsi} ≥ ${overbought})`;
          }
        }
      }
    }
  }

  // Final performance calculations
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : startingCapital;
  const totalReturn = Number((finalEquity - startingCapital).toFixed(2));
  const totalReturnPercent = Number(((totalReturn / startingCapital) * 100).toFixed(2));

  const closedTrades = trades.filter((t) => t.side === 'SELL');
  const winningTrades = closedTrades.filter((t) => (t.netPnl ?? 0) > 0).length;
  const losingTrades = closedTrades.filter((t) => (t.netPnl ?? 0) <= 0).length;
  const winRatePercent = closedTrades.length > 0
    ? Number(((winningTrades / closedTrades.length) * 100).toFixed(1))
    : 0;

  const benchmarkFinalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].benchmarkEquity : startingCapital;
  const benchmarkReturnPercent = Number((((benchmarkFinalEquity - startingCapital) / startingCapital) * 100).toFixed(2));

  return {
    parameters,
    trades,
    equityCurve,
    metrics: {
      totalReturnPercent,
      benchmarkReturnPercent,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRatePercent,
      maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
      finalEquity,
    },
    benchmark: {
      symbol: parameters.symbol,
      totalReturnPercent: benchmarkReturnPercent,
      buyAndHoldFinalEquity: benchmarkFinalEquity,
    },
    warnings,
    status: 'LIVE',
  };
}
