import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#070b12] text-slate-400 text-xs">
      {/* Educational & Compliance Disclaimer Banner */}
      <div className="border-b border-slate-800/60 bg-amber-950/20 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-start gap-2.5 text-amber-200/90 text-[11px] leading-relaxed">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p>
            <strong className="font-semibold text-amber-300">Mandatory Regulatory Notice:</strong> MarketLens AI is an educational research and paper-trading platform. It does <strong>not</strong> execute real-money transactions, is not a SEBI-registered investment advisor or research analyst, and does not provide personalized recommendations or guarantee financial returns. All market feeds provide real-time and closing figures for research analysis.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">MarketLens AI</span>
              <span className="rounded bg-teal-950/80 border border-teal-800/80 px-1.5 py-0.5 text-[10px] font-mono text-teal-400">
                REAL-TIME
              </span>
            </div>
            <p className="text-slate-400 max-w-md text-xs leading-relaxed">
              Transparent, explainable Indian stock market intelligence and zero-capital strategy simulation built with deterministic mathematical indicators and strict hallucination guardrails.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              <span>Zero Live Broker Order Endpoints • Look-ahead Bias Prevention</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="hover:text-teal-400 transition-colors">
                  Market Dashboard
                </Link>
              </li>
              <li>
                <Link to="/stocks/NSE_EQ|INE002A01018" className="hover:text-teal-400 transition-colors">
                  Stock Research &amp; Indicators
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-teal-400 transition-colors">
                  News Sentiment Radar
                </Link>
              </li>
              <li>
                <Link to="/strategy" className="hover:text-teal-400 transition-colors">
                  Strategy Lab
                </Link>
              </li>
              <li>
                <Link to="/watchlist" className="hover:text-teal-400 transition-colors">
                  Watchlists &amp; Alerts
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">Attributions &amp; Links</h4>
            <ul className="space-y-2 text-slate-400 text-[11px]">
              <li>
                <a
                  href="https://www.tradingview.com/lightweight-charts/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  <span>TradingView Lightweight Charts™</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.nseindia.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  <span>National Stock Exchange (NSE)</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.bseindia.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-teal-400 transition-colors"
                >
                  <span>BSE India Official</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>&copy; {new Date().getFullYear()} MarketLens AI. All rights reserved.</p>
          <p>Indian Market Session: Mon–Fri 09:15–15:30 IST</p>
        </div>
      </div>
    </footer>
  );
}

