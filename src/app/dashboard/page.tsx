'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  LineChart,
  Info,
} from 'lucide-react';
import { MarketOverview, Quote, Candle } from '@/types/market';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoversWidget } from '@/components/market/MoversWidget';
import { TradingViewChart } from '@/components/charts/TradingViewChart';

export default function DashboardPage() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockForChart, setSelectedStockForChart] = useState<Quote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch market overview
  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/market/overview');
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data: MarketOverview = await res.json();
      setOverview(data);
      if (data.allTracked.length > 0 && !selectedStockForChart) {
        setSelectedStockForChart(data.allTracked[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load market overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch candles when selected stock changes
  useEffect(() => {
    if (!selectedStockForChart) return;
    const fetchHistory = async () => {
      try {
        setChartLoading(true);
        const res = await fetch(
          `/api/stocks/${encodeURIComponent(selectedStockForChart.instrumentKey)}/history`
        );
        if (res.ok) {
          const data = await res.json();
          setCandles(data.candles || []);
        }
      } catch (err) {
        console.error('Failed to load chart history', err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchHistory();
  }, [selectedStockForChart]);

  const filteredStocks = React.useMemo(() => {
    if (!overview) return [];
    return overview.allTracked.filter((stock) => {
      const matchesSearch =
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [overview, searchQuery]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
          <span className="text-slate-400 text-sm">Loading real-time market overview...</span>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-6 text-center">
          <p className="text-rose-400 font-medium">{error || 'Data provider currently unreachable.'}</p>
          <button
            onClick={fetchOverview}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Provider Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Indian Market Overview</h1>
            <StatusBadge status={overview.status} size="md" />
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Tracking 20 Curated Equities across NSE & BSE</span>
            <span>•</span>
            <span className="font-mono">Observed as of {overview.asOf}</span>
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="flex items-center gap-2 self-start md:self-auto rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
          <span>Refresh Snapshot</span>
        </button>
      </div>

      {/* Indices Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {overview.indices.map((idx) => {
          const isPositive = idx.change >= 0;
          return (
            <div
              key={idx.instrumentKey}
              className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 shadow-sm hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{idx.name}</span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {idx.symbol}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-tabular">
                  ₹{idx.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold font-tabular px-2 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'
                  }`}
                >
                  {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  <span>
                    {isPositive ? '+' : ''}
                    {idx.change.toFixed(2)} ({isPositive ? '+' : ''}
                    {idx.changePercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Chart Preview for Selected Instrument */}
      {selectedStockForChart && (
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{selectedStockForChart.symbol}</h3>
                <span className="text-xs text-slate-400 font-normal">({selectedStockForChart.name})</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                  Interactive Preview
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs font-tabular">
                <span className="text-white font-bold">
                  ₹{selectedStockForChart.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={selectedStockForChart.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                >
                  {selectedStockForChart.change >= 0 ? '+' : ''}
                  {selectedStockForChart.change.toFixed(2)} (
                  {selectedStockForChart.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <Link
              href={`/stocks/${encodeURIComponent(selectedStockForChart.instrumentKey)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition self-start sm:self-auto"
            >
              <LineChart className="h-3.5 w-3.5" />
              <span>Full AI Research & Indicators</span>
            </Link>
          </div>

          <div className="mt-4">
            {chartLoading ? (
              <div className="h-[350px] flex items-center justify-center text-slate-500 text-xs">
                Rendering candlesticks...
              </div>
            ) : (
              <TradingViewChart
                candles={candles}
                symbol={selectedStockForChart.symbol}
                height={350}
              />
            )}
          </div>
        </div>
      )}

      {/* Grid: Tracked Stocks Universe + Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tracked Universe Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Curated Equities Universe</span>
                <span className="text-xs font-normal text-slate-400">({filteredStocks.length} stocks)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any stock row to inspect its chart or launch full AI research.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0e1424]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Instrument</th>
                  <th className="py-3 px-4 font-semibold text-right">Last Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Change</th>
                  <th className="py-3 px-4 font-semibold text-right hidden sm:table-cell">Volume</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredStocks.map((stock) => {
                  const isPositive = stock.change >= 0;
                  const isSelected = selectedStockForChart?.instrumentKey === stock.instrumentKey;
                  return (
                    <tr
                      key={stock.instrumentKey}
                      onClick={() => setSelectedStockForChart(stock)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition ${
                        isSelected ? 'bg-slate-800/60' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{stock.symbol}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {stock.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium font-tabular text-white">
                        ₹{stock.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium font-tabular">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
                          {stock.changePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 hidden sm:table-cell font-tabular">
                        {stock.volume ? (stock.volume / 100000).toFixed(2) + ' L' : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={stock.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/stocks/${encodeURIComponent(stock.instrumentKey)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-teal-300 transition"
                        >
                          <span>Analyze</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Movers Widget */}
        <div className="space-y-6">
          <MoversWidget
            topGainers={overview.topGainers}
            topLosers={overview.topLosers}
          />

          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 text-xs text-slate-400 space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Info className="h-4 w-4 text-teal-400" />
              <span>Real-Time Market Intelligence</span>
            </h4>
            <p className="leading-relaxed">
              Equities stream live pricing, indicator updates, and algorithmic movers across NSE & BSE. Configure real-time price alerts to receive instant notifications when thresholds are breached.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
