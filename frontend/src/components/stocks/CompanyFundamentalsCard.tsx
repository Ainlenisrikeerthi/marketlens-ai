import React from 'react';
import {
  Building2,
  Info,
} from 'lucide-react';
import { CompanyFundamentals } from '../../types/market';

interface CompanyFundamentalsCardProps {
  fundamentals: CompanyFundamentals;
  symbol: string;
  currentPrice: number;
}

export function CompanyFundamentalsCard({
  fundamentals,
  symbol,
  currentPrice,
}: CompanyFundamentalsCardProps) {
  // 52-Week Range calculation
  const rangeSpan = fundamentals.yearHigh - fundamentals.yearLow;
  const currentOffset = Math.max(0, currentPrice - fundamentals.yearLow);
  const rangePercent = rangeSpan > 0 ? Math.min(100, Math.max(0, (currentOffset / rangeSpan) * 100)) : 50;

  // Valuation assessment
  const isPeCheaperThanSector = fundamentals.peRatio < fundamentals.industryPe;

  // Format market cap in Lakh Crores
  const marketCapLakhCr = (fundamentals.marketCapCr / 100000).toFixed(2);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 shadow-md space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Company Fundamentals & Key Ratios</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-teal-400">
                {fundamentals.sector}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Corporate valuation, capital structure, and profitability metrics for {symbol}.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Source: {fundamentals.source}
        </div>
      </div>

      {/* 52-Week Range Bar */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-4 space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="font-semibold text-slate-300">52-Week Trading Range</span>
          <span className="font-tabular font-semibold text-teal-400">
            Current LTP: ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Visual Range Bar */}
        <div className="relative pt-1">
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${rangePercent}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-400 font-tabular">
          <span>52W Low: <strong className="text-white">₹{fundamentals.yearLow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-[10px] text-slate-500">{rangePercent.toFixed(1)}% of 52W range</span>
          <span>52W High: <strong className="text-white">₹{fundamentals.yearHigh.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* Financial Ratios Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Market Cap */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Market Cap</span>
          <div className="text-lg font-bold text-white font-tabular">
            ₹{marketCapLakhCr} <span className="text-xs font-normal text-slate-400">Lakh Cr</span>
          </div>
          <span className="text-[10px] text-slate-500 block">₹{fundamentals.marketCapCr.toLocaleString('en-IN')} Cr</span>
        </div>

        {/* P/E Ratio */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">P/E Ratio</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                isPeCheaperThanSector ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
              }`}
            >
              {isPeCheaperThanSector ? 'Discount to Sector' : 'Sector Premium'}
            </span>
          </div>
          <div className="text-lg font-bold text-white font-tabular">{fundamentals.peRatio.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500 block">Industry P/E: {fundamentals.industryPe.toFixed(2)}</span>
        </div>

        {/* P/B Ratio */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Price to Book (P/B)</span>
          <div className="text-lg font-bold text-white font-tabular">{fundamentals.pbRatio.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500 block">Book Value: ₹{fundamentals.bookValue.toFixed(1)}</span>
        </div>

        {/* EPS (TTM) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">EPS (TTM)</span>
          <div className="text-lg font-bold text-white font-tabular">₹{fundamentals.epsTtm.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500 block">Trailing 12-Month Net</span>
        </div>

        {/* ROE */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Return on Equity (ROE)</span>
          <div className="text-lg font-bold text-emerald-400 font-tabular">{fundamentals.roePercent.toFixed(1)}%</div>
          <span className="text-[10px] text-slate-500 block">Net Income / Shareholder Equity</span>
        </div>

        {/* ROCE */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">ROCE</span>
          <div className="text-lg font-bold text-emerald-400 font-tabular">{fundamentals.rocePercent.toFixed(1)}%</div>
          <span className="text-[10px] text-slate-500 block">EBIT / Capital Employed</span>
        </div>

        {/* Debt to Equity */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Debt to Equity</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                fundamentals.debtToEquity < 0.5
                  ? 'bg-emerald-950 text-emerald-400'
                  : fundamentals.debtToEquity < 1.5
                  ? 'bg-blue-950 text-blue-400'
                  : 'bg-amber-950 text-amber-400'
              }`}
            >
              {fundamentals.debtToEquity < 0.5 ? 'Low Debt' : fundamentals.debtToEquity < 1.5 ? 'Moderate' : 'High Leverage'}
            </span>
          </div>
          <div className="text-lg font-bold text-white font-tabular">{fundamentals.debtToEquity.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500 block">Total Debt / Total Equity</span>
        </div>

        {/* Dividend Yield */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Dividend Yield</span>
          <div className="text-lg font-bold text-white font-tabular">{fundamentals.dividendYieldPercent.toFixed(2)}%</div>
          <span className="text-[10px] text-slate-500 block">Annualized Cash Payout</span>
        </div>

        {/* Beta */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Beta (1-Year)</span>
          <div className="text-lg font-bold text-white font-tabular">{fundamentals.beta.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500 block">Volatility vs NIFTY 50 (1.0 = equal)</span>
        </div>

        {/* Face Value */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Face Value</span>
          <div className="text-lg font-bold text-white font-tabular">₹{fundamentals.faceValue}</div>
          <span className="text-[10px] text-slate-500 block">Nominal Par Value Per Share</span>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span>
          Fundamental metrics reflect publicly reported financial statements and normalized trailing twelve-month figures. Past corporate metrics do not predict future share price performance.
        </span>
      </div>
    </div>
  );
}
