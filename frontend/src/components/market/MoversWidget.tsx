import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Quote } from '../../types/market';

interface MoversWidgetProps {
  topGainers: Quote[];
  topLosers: Quote[];
}

export function MoversWidget({ topGainers, topLosers }: MoversWidgetProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
  const items = activeTab === 'gainers' ? topGainers : topLosers;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Tracked Movers</span>
            <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Curated Universe (20 Stocks)
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Info className="h-3 w-3 text-slate-500 inline" />
            Leaders strictly within our 20 tracked instruments, not entire exchange.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center rounded-lg bg-slate-900/80 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('gainers')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === 'gainers'
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Top Gainers ({topGainers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('losers')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeTab === 'losers'
                ? 'bg-rose-950/70 text-rose-400 border border-rose-800/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Top Losers ({topLosers.length})</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60 mt-2">
        {items.map((quote) => {
          const isPositive = quote.change >= 0;
          return (
            <Link
              key={quote.instrumentKey}
              to={`/stocks/${encodeURIComponent(quote.instrumentKey)}`}
              className="flex items-center justify-between py-3 px-2 hover:bg-slate-800/40 rounded-lg transition group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm group-hover:text-teal-400 transition-colors">
                    {quote.symbol}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">NSE</span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{quote.name}</p>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold text-white font-tabular">
                  ₹{quote.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div
                  className={`flex items-center justify-end gap-1 text-xs font-medium font-tabular ${
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
