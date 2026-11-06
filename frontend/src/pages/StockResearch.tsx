import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Brain,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { StockAnalysis, Candle, Instrument } from '../types/market';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TradingViewChart } from '../components/charts/TradingViewChart';
import { InstrumentSwitcher } from '../components/market/InstrumentSwitcher';
import { CompanyFundamentalsCard } from '../components/stocks/CompanyFundamentalsCard';
import { fetchApi } from '../lib/api';

export function StockResearchPage() {
  const { instrument } = useParams<{ instrument: string }>();
  const instrumentKey = instrument || 'NSE_EQ|INE002A01018';

  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchApi<StockAnalysis>(`/stocks/${encodeURIComponent(instrumentKey)}/analysis/`),
      fetchApi<{ candles: Candle[] }>(`/stocks/${encodeURIComponent(instrumentKey)}/history/?days=60`),
      fetchApi<Instrument[]>('/instruments/search/'),
    ])
      .then(([analysisData, historyData, instrumentsData]) => {
        if (!isMounted) return;
        setAnalysis(analysisData);
        setCandles(historyData.candles || []);
        setAllInstruments(instrumentsData.filter((i) => !i.isIndex));
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load stock research:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stock data');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [instrumentKey]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
          <span className="text-slate-400 text-sm">Loading stock research & indicators...</span>
        </div>
      </div>
    );
  }

  if (error || !analysis || !analysis.quote) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-8 text-center">
          <p className="text-rose-400 font-semibold">{error || 'Instrument not found.'}</p>
        </div>
      </div>
    );
  }

  const quote = analysis.quote;
  const targetInst = analysis.instrument || {
    instrumentKey: analysis.instrumentKey,
    symbol: analysis.symbol,
    name: quote.name,
    exchange: 'NSE' as const,
    currency: 'INR' as const,
  };
  const fundamentals = analysis.fundamentals;
  const isPositive = quote.change >= 0;
  const ind = analysis.indicators;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Instrument Switcher & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-800 gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{targetInst.symbol}</h1>
            <span className="text-slate-400 text-sm font-medium">{targetInst.name}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-teal-400">
              {targetInst.exchange}
            </span>
            <StatusBadge status={quote.status} size="sm" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-mono">
            <span>Key: {targetInst.instrumentKey}</span>
            {targetInst.sector && <span>Sector: {targetInst.sector}</span>}
            <span>Observed: {quote.asOf.split('T')[0]} 15:30 IST</span>
          </div>
        </div>

        {/* Quick Stock Selector Dropdown */}
        <div className="self-start lg:self-auto">
          <InstrumentSwitcher
            currentKey={targetInst.instrumentKey}
            instruments={allInstruments}
          />
        </div>
      </div>

      {/* Quote Price & Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">Last Traded Price</span>
          <span className="text-xl font-bold text-white font-tabular">
            ₹{quote.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div
            className={`flex items-center gap-1 text-xs font-semibold mt-1 font-tabular ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {quote.change.toFixed(2)} ({isPositive ? '+' : ''}
              {quote.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">Day High</span>
          <span className="text-lg font-bold text-white font-tabular">
            ₹{quote.high?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Session Peak</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">Day Low</span>
          <span className="text-lg font-bold text-white font-tabular">
            ₹{quote.low?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Session Trough</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">Previous Close</span>
          <span className="text-lg font-bold text-white font-tabular">
            ₹{quote.previousClose?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Prior Session</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">Traded Volume</span>
          <span className="text-lg font-bold text-white font-tabular">
            {quote.volume ? (quote.volume / 100000).toFixed(2) + ' Lakhs' : '—'}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Cumulative Shares</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4">
          <span className="text-xs text-slate-400 block mb-1">RSI (14-Day)</span>
          <span className="text-lg font-bold text-teal-300 font-tabular">
            {ind.rsi14?.toFixed(2) || '—'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            {(ind.rsi14 || 50) > 70
              ? 'Overbought'
              : (ind.rsi14 || 50) < 30
              ? 'Oversold'
              : 'Neutral Range'}
          </span>
        </div>
      </div>

      {/* Interactive Candlestick Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <LineChart className="h-4 w-4 text-teal-400" />
            <span>Interactive Daily Candlestick Chart (60 Sessions)</span>
          </h2>
          <span className="text-xs text-slate-500">Zoom with wheel / Drag to pan</span>
        </div>
        <TradingViewChart candles={candles} symbol={targetInst.symbol} height={420} />
      </div>

      {/* Technical Indicators Calculation Grid */}
      <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              <span>Deterministic Technical Indicators</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Computed in deterministic application code from 60 verified daily OHLCV bars.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Pure Algorithm • No Hallucinations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400 font-medium">SMA(20) vs SMA(50)</span>
            <div className="mt-2 space-y-1 font-tabular text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">SMA 20:</span>
                <span className="font-semibold text-white">₹{ind.sma20?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SMA 50:</span>
                <span className="font-semibold text-white">₹{ind.sma50?.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-teal-400">
              {ind.sma20 && ind.sma50 && ind.sma20 > ind.sma50
                ? 'Bullish Momentum (SMA 20 > 50)'
                : 'Consolidation / Bearish'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400 font-medium">EMA(20) vs EMA(50)</span>
            <div className="mt-2 space-y-1 font-tabular text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">EMA 20:</span>
                <span className="font-semibold text-white">₹{ind.ema20?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">EMA 50:</span>
                <span className="font-semibold text-white">₹{ind.ema50?.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-teal-400">Exponential Weighted Trend</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400 font-medium">Relative Strength Index (14)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white font-tabular">{ind.rsi14?.toFixed(2)}</span>
              <span className="text-xs text-slate-400">Scale: 0-100</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden flex">
              <div
                className="bg-teal-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(Math.max(ind.rsi14 || 50, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs text-slate-400 font-medium">Price vs 20-Day SMA</span>
            <div className="mt-2 text-sm font-semibold text-white font-tabular">
              {ind.sma20 ? (
                quote.lastPrice > ind.sma20 ? (
                  <span className="text-emerald-400">
                    Above SMA by +{(((quote.lastPrice - ind.sma20) / ind.sma20) * 100).toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-rose-400">
                    Below SMA by -{(((ind.sma20 - quote.lastPrice) / ind.sma20) * 100).toFixed(2)}%
                  </span>
                )
              ) : (
                '—'
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Descriptive condition only</div>
          </div>
        </div>
      </div>

      {/* Company Fundamentals Section */}
      {fundamentals && (
        <CompanyFundamentalsCard
          fundamentals={fundamentals}
          symbol={targetInst.symbol}
          currentPrice={quote.lastPrice}
        />
      )}

      {/* Grounded AI Research Card */}
      <div className="rounded-xl border border-teal-800/60 bg-gradient-to-b from-[#0f172a] to-[#0e1424] p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Grounded AI Stock Research</span>
                <span className="rounded bg-teal-950 px-2 py-0.5 text-[10px] font-mono text-teal-300 border border-teal-800">
                  Strictly Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generated via Claude schema contract using only displayed price, indicator, and news facts.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Observation Timestamp: {analysis.asOf}
          </div>
        </div>

        {/* Trend Summary */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block mb-1">
            Observed Technical Trend Summary
          </span>
          <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Observations & Risks Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-teal-400" />
              <span>Supporting Observations</span>
            </h4>
            <ul className="space-y-2">
              {analysis.observations.map((obs, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-xs text-slate-300 leading-relaxed"
                >
                  {obs}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>Risks & Market Uncertainties</span>
            </h4>
            <ul className="space-y-2">
              {analysis.risks.map((risk, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-rose-950/40 bg-rose-950/10 p-3 text-xs text-rose-200/90 leading-relaxed"
                >
                  {risk}
                </li>
              ))}
              {analysis.uncertainties?.map((unc, idx) => (
                <li
                  key={`u-${idx}`}
                  className="rounded-lg border border-amber-950/40 bg-amber-950/10 p-3 text-xs text-amber-200/90 leading-relaxed"
                >
                  {unc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sources and Informational Disclaimer */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Referenced Sources:</span>
            {analysis.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-teal-400 hover:underline"
              >
                <span>{src.label}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Informational research only • Not guaranteed buy/sell signals • No real capital execution
          </div>
        </div>
      </div>
    </div>
  );
}
