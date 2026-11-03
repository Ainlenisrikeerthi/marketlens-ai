'use client';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Info,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { BacktestParameters, BacktestResult } from '@/types/market';
import { CURATED_INSTRUMENTS } from '@/lib/data-provider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PaperPortfolio } from '@/lib/simulation/paper-portfolio';

export default function StrategyLabPage() {
  const [activeTab, setActiveTab] = useState<'BACKTEST' | 'PAPER_PORTFOLIO'>('BACKTEST');

  // Backtest state
  const [strategy, setStrategy] = useState<'SMA_CROSSOVER' | 'RSI_THRESHOLD'>('SMA_CROSSOVER');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [startingCapital, setStartingCapital] = useState(500000);
  const [positionSizePercent, setPositionSizePercent] = useState(100);
  const [estimatedFeePercent, setEstimatedFeePercent] = useState(0.1);
  const [estimatedSlippagePercent, setEstimatedSlippagePercent] = useState(0.05);
  const [smaFast, setSmaFast] = useState(10);
  const [smaSlow, setSmaSlow] = useState(20);
  const [rsiOversold, setRsiOversold] = useState(35);
  const [rsiOverbought, setRsiOverbought] = useState(65);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Paper portfolio state
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [orderSymbol, setOrderSymbol] = useState('RELIANCE');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderQty, setOrderQty] = useState(10);
  const [orderPrice, setOrderPrice] = useState(2980);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const runBacktest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: BacktestParameters = {
      symbol,
      strategy,
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      startingCapital,
      positionSizePercent,
      estimatedFeePercent,
      estimatedSlippagePercent,
      smaFast,
      smaSlow,
      rsiOversold,
      rsiOverbought,
    };

    try {
      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data: BacktestResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backtest execution failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch {
      // Ignored in offline preview
    }
  };

  const executePaperOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderLoading(true);
    setOrderMessage(null);

    const inst = CURATED_INSTRUMENTS.find((i) => i.symbol === orderSymbol) || CURATED_INSTRUMENTS[3];

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ORDER',
          instrumentKey: inst.instrumentKey,
          symbol: inst.symbol,
          name: inst.name,
          side: orderSide,
          quantity: orderQty,
          price: orderPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Simulated order rejected');
      }

      setPortfolio(json.portfolio);
      setOrderMessage({ type: 'success', text: json.message });
    } catch (err: unknown) {
      setOrderMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Order execution failed',
      });
    } finally {
      setOrderLoading(false);
    }
  };

  const resetPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET', startingCash: 500000 }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data.portfolio);
        setOrderMessage({ type: 'success', text: 'Virtual paper account reset to ₹5,00,000 cash.' });
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    runBacktest();
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-teal-400" />
              <span>Strategy Lab & Paper Trading</span>
            </h1>
            <span className="rounded-full bg-amber-950/80 border border-amber-600/60 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              SIMULATED — NOT LIVE TRADING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic daily-bar backtesting with next-bar execution guarantees, fee models, and zero-capital virtual paper trading.
          </p>
        </div>

        <StatusBadge status="LIVE" size="md" />
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('BACKTEST')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'BACKTEST'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Strategy Backtester</span>
        </button>

        <button
          onClick={() => setActiveTab('PAPER_PORTFOLIO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'PAPER_PORTFOLIO'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="h-3.5 w-3.5" />
          <span>Paper Portfolio Account</span>
        </button>
      </div>

      {activeTab === 'BACKTEST' ? (
        <>
          {/* Look-Ahead Bias Safety Notice */}
          <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 p-4 text-xs text-teal-200/90 flex items-start gap-3">
            <Info className="h-4 w-4 shrink-0 text-teal-400 mt-0.5" />
            <div>
              <strong className="text-teal-300 font-semibold">Strict Look-Ahead Bias Prevention:</strong> Signals are evaluated strictly at the close of bar <em>T</em> and simulated fills are calculated <strong>no earlier than the open of bar <em>T+1</em></strong> with transaction fee ({estimatedFeePercent}%) and slippage ({estimatedSlippagePercent}%) deductions.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Strategy Configuration Form */}
            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-6">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Simulation Parameters
              </h2>

              <form onSubmit={runBacktest} className="space-y-4 text-xs">
                {/* Strategy Select */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Strategy Rule</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as 'SMA_CROSSOVER' | 'RSI_THRESHOLD')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="SMA_CROSSOVER">SMA Crossover (Fast vs Slow)</option>
                    <option value="RSI_THRESHOLD">RSI Threshold (Oversold/Overbought)</option>
                  </select>
                </div>

                {/* Symbol Select */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Test Instrument</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white focus:border-teal-500 focus:outline-none"
                  >
                    {CURATED_INSTRUMENTS.filter((i) => !i.isIndex).map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol} — {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Strategy Specific Inputs */}
                {strategy === 'SMA_CROSSOVER' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Fast SMA (Bars)</label>
                      <input
                        type="number"
                        min="2"
                        max="50"
                        value={smaFast}
                        onChange={(e) => setSmaFast(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Slow SMA (Bars)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={smaSlow}
                        onChange={(e) => setSmaSlow(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">RSI Oversold (Buy)</label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={rsiOversold}
                        onChange={(e) => setRsiOversold(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">RSI Overbought (Sell)</label>
                      <input
                        type="number"
                        min="50"
                        max="90"
                        value={rsiOverbought}
                        onChange={(e) => setRsiOverbought(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                      />
                    </div>
                  </div>
                )}

                {/* Capital & Position Sizing */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Virtual Capital (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={startingCapital}
                    onChange={(e) => setStartingCapital(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Position Size per Trade ({positionSizePercent}%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={positionSizePercent}
                    onChange={(e) => setPositionSizePercent(Number(e.target.value))}
                    className="w-full accent-teal-400"
                  />
                </div>

                {/* Fees and Slippage */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Est. Fees (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedFeePercent}
                      onChange={(e) => setEstimatedFeePercent(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Est. Slippage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedSlippagePercent}
                      onChange={(e) => setEstimatedSlippagePercent(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold p-2.5 text-xs transition shadow-md shadow-teal-500/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Computing Strategy Simulation...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Execute Backtest Run</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Backtest Results Area */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-4 text-xs text-rose-400">
                  {error}
                </div>
              )}

              {result && (
                <>
                  {/* Performance Metrics Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
                      <span className="text-xs text-slate-400 block mb-1">Strategy Return</span>
                      <span
                        className={`text-xl font-bold font-tabular ${
                          result.metrics.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {result.metrics.totalReturnPercent >= 0 ? '+' : ''}
                        {result.metrics.totalReturnPercent.toFixed(2)}%
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1 font-tabular">
                        Final: ₹{result.metrics.finalEquity.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
                      <span className="text-xs text-slate-400 block mb-1">Buy & Hold Benchmark</span>
                      <span
                        className={`text-xl font-bold font-tabular ${
                          result.benchmark.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {result.benchmark.totalReturnPercent >= 0 ? '+' : ''}
                        {result.benchmark.totalReturnPercent.toFixed(2)}%
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1 font-tabular">
                        Final: ₹{result.benchmark.buyAndHoldFinalEquity.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
                      <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
                      <span className="text-xl font-bold text-white font-tabular">
                        {result.metrics.winRatePercent.toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1 font-tabular">
                        {result.metrics.winningTrades} Wins / {result.metrics.losingTrades} Losses
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
                      <span className="text-xs text-slate-400 block mb-1">Max Drawdown</span>
                      <span className="text-xl font-bold text-rose-400 font-tabular">
                        -{result.metrics.maxDrawdownPercent.toFixed(2)}%
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1">Peak-to-trough decline</span>
                    </div>
                  </div>

                  {/* Trade Ledger */}
                  <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Simulated Trade Ledger</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          {result.trades.length} Orders Simulated
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Zero Real Orders Placed
                      </span>
                    </div>

                    {result.trades.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">
                        No trade signals were triggered by the parameter thresholds during this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Side</th>
                              <th className="py-2.5 px-3 text-right">Fill Price</th>
                              <th className="py-2.5 px-3 text-right">Qty</th>
                              <th className="py-2.5 px-3 text-right">Fees</th>
                              <th className="py-2.5 px-3 text-right">Net PnL</th>
                              <th className="py-2.5 px-3">Condition Trigger</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-tabular text-slate-300">
                            {result.trades.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-800/30">
                                <td className="py-2.5 px-3">{t.date}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.side === 'BUY'
                                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                                        : 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                                    }`}
                                  >
                                    {t.side}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-white">
                                  ₹{t.price.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right">{t.quantity}</td>
                                <td className="py-2.5 px-3 text-right text-slate-400">₹{t.fees.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  {t.netPnl !== undefined ? (
                                    <span className={t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {t.netPnl >= 0 ? '+' : ''}₹{t.netPnl.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[200px] truncate">
                                  {t.reason || 'Technical Condition'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Paper Portfolio & Order Execution Section */
        <div className="space-y-8">
          {/* Virtual Account Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5">
              <span className="text-xs text-slate-400 block mb-1">Total Account Equity</span>
              <span className="text-2xl font-bold text-white font-tabular">
                ₹{portfolio?.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '5,00,000.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                Cash + Holdings Market Value
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Available Virtual Cash</span>
                <button
                  onClick={resetPortfolio}
                  title="Reset virtual cash to ₹5,00,000"
                  className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
              <span className="text-2xl font-bold text-teal-400 font-tabular">
                ₹{portfolio?.cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '5,00,000.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Ready for simulated allocation</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5">
              <span className="text-xs text-slate-400 block mb-1">Holdings Market Value</span>
              <span className="text-2xl font-bold text-white font-tabular">
                ₹{portfolio?.holdingsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {portfolio?.holdings.length || 0} Open Positions
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5">
              <span className="text-xs text-slate-400 block mb-1">Realized Net P&L</span>
              <span
                className={`text-2xl font-bold font-tabular ${
                  (portfolio?.totalRealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(portfolio?.totalRealizedPnL || 0) >= 0 ? '+' : ''}
                ₹{portfolio?.totalRealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                From closed paper trades
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Simulated Order Ticket Form */}
            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-teal-400" />
                  <span>Simulated Order Ticket</span>
                </h3>
                <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-800">
                  PAPER ONLY
                </span>
              </div>

              {orderMessage && (
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    orderMessage.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {orderMessage.text}
                </div>
              )}

              <form onSubmit={executePaperOrder} className="space-y-4 text-xs">
                {/* Side Selection */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Action Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderSide('BUY')}
                      className={`py-2 rounded-lg font-bold text-xs transition border ${
                        orderSide === 'BUY'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      SIMULATE BUY
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderSide('SELL')}
                      className={`py-2 rounded-lg font-bold text-xs transition border ${
                        orderSide === 'SELL'
                          ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      SIMULATE SELL
                    </button>
                  </div>
                </div>

                {/* Stock Selector */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Instrument</label>
                  <select
                    value={orderSymbol}
                    onChange={(e) => setOrderSymbol(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white focus:border-teal-500 focus:outline-none"
                  >
                    {CURATED_INSTRUMENTS.filter((i) => !i.isIndex).map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol} — {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Shares (Qty)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Simulated Price (₹)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.05"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                    />
                  </div>
                </div>

                {/* Estimated Cost Breakdown */}
                <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Gross Value:</span>
                    <span className="font-tabular text-white">₹{(orderQty * orderPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Fees (0.10%):</span>
                    <span className="font-tabular text-slate-300">₹{((orderQty * orderPrice) * 0.001).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
                    <span className="text-white">Estimated {orderSide === 'BUY' ? 'Total Outlay' : 'Net Proceeds'}:</span>
                    <span className="font-tabular text-teal-400">
                      ₹{orderSide === 'BUY'
                        ? ((orderQty * orderPrice) * 1.001).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                        : ((orderQty * orderPrice) * 0.999).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={orderLoading}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs transition shadow-md ${
                    orderSide === 'BUY'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  {orderLoading ? 'Processing Simulation...' : `Submit Simulated ${orderSide}`}
                </button>
              </form>
            </div>

            {/* Current Open Holdings Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Current Virtual Holdings</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {portfolio?.holdings.length || 0} Assets
                    </span>
                  </h3>
                </div>

                {!portfolio || portfolio.holdings.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 space-y-1">
                    <p>No open virtual holdings in this portfolio.</p>
                    <p className="text-[11px] text-slate-600">
                      Use the Simulated Order Ticket on the left to allocate virtual capital.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Symbol</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Avg Price</th>
                          <th className="py-2.5 px-3 text-right">Market Price</th>
                          <th className="py-2.5 px-3 text-right">Current Value</th>
                          <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-tabular text-slate-300">
                        {portfolio.holdings.map((h) => (
                          <tr key={h.instrumentKey} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-white block">{h.symbol}</span>
                              <span className="text-[10px] text-slate-500">{h.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-white">{h.quantity}</td>
                            <td className="py-2.5 px-3 text-right">₹{h.averageBuyPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-white">₹{h.currentPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">₹{h.currentValue.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              <span className={h.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {h.unrealizedPnL >= 0 ? '+' : ''}₹{h.unrealizedPnL.toFixed(2)} ({h.unrealizedPnL >= 0 ? '+' : ''}{h.unrealizedPnLPercent.toFixed(2)}%)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Trade History Ledger */}
              {portfolio && portfolio.trades.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Recent Paper Orders Ledger</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-tabular">
                        {portfolio.trades.length} Executed
                      </span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Side</th>
                          <th className="py-2 px-3">Symbol</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-right">Fees</th>
                          <th className="py-2 px-3 text-right">Realized P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-tabular text-slate-300">
                        {portfolio.trades.slice(0, 10).map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-slate-400 text-[11px]">{t.timestamp.split('T')[1].split('.')[0]}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.side === 'BUY'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                                    : 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                                }`}
                              >
                                {t.side}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
                            <td className="py-2 px-3 text-right">{t.quantity}</td>
                            <td className="py-2 px-3 text-right">₹{t.price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-slate-400">₹{t.fees.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {t.realizedPnL !== undefined ? (
                                <span className={t.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {t.realizedPnL >= 0 ? '+' : ''}₹{t.realizedPnL.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
