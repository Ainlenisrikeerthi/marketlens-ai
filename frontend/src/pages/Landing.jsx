import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  ShieldCheck,
  LineChart,
  FlaskConical,
  Newspaper,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { fetchApi } from '../lib/api';

export function LandingPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/market/overview/')
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load market overview:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-800/80 bg-gradient-to-b from-[#0e1424] via-[#090d16] to-[#090d16]">
        {/* Glow ambient effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-teal-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/40 px-3.5 py-1 text-xs text-teal-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Institutional Indian Equity Intelligence • Real-Time Stream Active</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Indian Stock Market Intelligence with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
              Explainable AI
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Explore 20 curated Indian equities with deterministic mathematical indicators, grounded AI research, source-attributed news sentiment, and zero-capital strategy backtesting.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-3 text-sm transition shadow-lg shadow-teal-500/20"
            >
              <span>Explore Market Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/strategy"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition"
            >
              <FlaskConical className="h-4 w-4 text-teal-400" />
              <span>Preview Strategy Lab</span>
            </Link>
          </div>

          {/* Boundaries Checkpoint */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
              No Real-Money Orders
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
              Next-Bar Look-Ahead Bias Prevention
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
              Live &amp; Real-Time Market Data Architecture
            </span>
          </div>
        </div>
      </section>

      {/* Live Market Index Snapshot Bar */}
      <section className="border-b border-slate-800 bg-[#0a0f1d] py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Major Benchmark Indices
              </h2>
              {overview && <StatusBadge status={overview.status} size="sm" />}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live Feed as of {overview?.asOf || 'Updating...'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
              ))
            ) : overview?.indices.map((idx) => {
              const isPositive = idx.change >= 0;
              return (
                <div
                  key={idx.instrumentKey}
                  className="rounded-xl border border-slate-800 bg-[#0e1424] p-4 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-medium text-slate-400 block">{idx.name}</span>
                    <span className="text-lg font-bold text-white font-tabular">
                      &#8377;{idx.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div
                    className={`text-right text-xs font-semibold font-tabular px-2.5 py-1 rounded-md ${
                      isPositive
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                    }`}
                  >
                    <div>
                      {isPositive ? '+' : ''}
                      {idx.change.toFixed(2)}
                    </div>
                    <div>
                      {isPositive ? '+' : ''}
                      {idx.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5 Core Modules Pillars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Architecture Built on Grounded Truth
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              MarketLens AI avoids black-box claims and synthetic hallucinations by separating deterministic mathematical calculations from contextual language explanations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-4">
                <LineChart className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Deterministic Indicators</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SMA(20/50), EMA(20/50), and RSI(14) are calculated in pure, tested application code — never estimated by an LLM.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Grounded AI Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini synthesizes verified technical observations, risks, and uncertainties strictly from supplied data contracts with source attributions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                <FlaskConical className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Simulated Strategy Lab</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test SMA crossover and RSI threshold rules with realistic brokerage fee models, slippage, and next-bar execution guarantees.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
                <Newspaper className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Attributed News Radar</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classify market sentiment with full attribution to original publishers and explicit disclaimers regarding market predictability.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Watchlists &amp; Alerts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organize tracked instruments, configure price thresholds, and view persisted triggering events in an isolated user workspace.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">SEBI Guardrails &amp; Safety</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict boundaries against real-money execution, automated trading, or unregistered advisory promises. Built solely for education.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

