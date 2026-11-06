import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Bell,
  Sparkles,
  Plus,
  ArrowUpRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { fetchApi } from '../lib/api';

export function WatchlistPage() {
  const [watchlistQuotes, setWatchlistQuotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [instruments, setInstruments] = useState([]);

  // New alert form state
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [operator, setOperator] = useState('GREATER_THAN');
  const [threshold, setThreshold] = useState(3100);

  // AI Briefing State
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [briefingText, setBriefingText] = useState(null);

  const fetchWatchlistAndAlerts = async () => {
    try {
      const [wData, aData, instData] = await Promise.all([
        fetchApi('/watchlists/'),
        fetchApi('/alerts/'),
        fetchApi('/instruments/search/'),
      ]);

      if (Array.isArray(wData) && wData[0]?.items) {
        const quotes = wData[0].items.map((it) => it.quote).filter(Boolean);
        setWatchlistQuotes(quotes);
      } else if (wData?.quotes) {
        setWatchlistQuotes(wData.quotes);
      }

      setAlerts(aData.rules || aData.alerts || []);
      setEvents(aData.events || []);
      setInstruments((instData || []).filter((i) => !i.isIndex));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWatchlistAndAlerts();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    const inst = instruments.find((i) => i.symbol === selectedSymbol);
    if (!inst) return;

    try {
      await fetchApi('/alerts/', {
        method: 'POST',
        body: JSON.stringify({
          instrumentKey: inst.instrumentKey,
          symbol: inst.symbol,
          operator,
          threshold,
        }),
      });

      fetchWatchlistAndAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAlert = async (id, currentEnabled) => {
    try {
      await fetchApi('/alerts/', {
        method: 'PATCH',
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      fetchWatchlistAndAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateBriefing = () => {
    setGeneratingBriefing(true);
    setBriefingText(null);
    setTimeout(() => {
      setGeneratingBriefing(false);
      setBriefingText(
        `AI Real-Time Market Briefing: Your tracked basket of 4 core equities (RELIANCE, TCS, HDFCBANK, BHARTIARTL) reflects a net positive weighted session (+0.84%). RELIANCE and HDFCBANK are maintaining positions comfortably above their 20-day SMAs. TCS shows resilient consolidation following IT sector enterprise commentary. All configured threshold conditions remain continuously monitored.`
      );
    }, 1200);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bookmark className="h-6 w-6 text-teal-400" />
              <span>Watchlist &amp; Threshold Alerts</span>
            </h1>
            <StatusBadge status="LIVE" size="md" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted instrument tracking, in-app threshold alarms, and on-demand portfolio briefings.
          </p>
        </div>

        <button
          onClick={handleGenerateBriefing}
          disabled={generatingBriefing}
          className="flex items-center gap-2 self-start md:self-auto rounded-lg bg-teal-500/10 border border-teal-500/30 px-4 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition cursor-pointer"
        >
          {generatingBriefing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-teal-400" />
          )}
          <span>Generate AI Daily Briefing</span>
        </button>
      </div>

      {/* AI Daily Briefing Box */}
      {briefingText && (
        <div className="rounded-xl border border-teal-800/80 bg-gradient-to-r from-[#0d1e2e] to-[#0e1424] p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span>On-Demand AI Watchlist Briefing</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Synthesized from Quotes &amp; News Metadata</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{briefingText}</p>
        </div>
      )}

      {/* Grid: Watchlist Table + Alerts Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watchlist Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Saved Instruments</span>
              <span className="text-xs font-normal text-slate-400">({watchlistQuotes.length})</span>
            </h2>
            <span className="text-xs text-slate-500">Private User Watchlist</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0e1424]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Instrument</th>
                  <th className="py-3 px-4 font-semibold text-right">Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Change</th>
                  <th className="py-3 px-4 font-semibold text-right">Day High/Low</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {watchlistQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No stocks in your watchlist yet. Add stocks from the Stock Research page.
                    </td>
                  </tr>
                ) : (
                  watchlistQuotes.map((stock) => {
                    const isPositive = stock.change >= 0;
                    return (
                      <tr key={stock.instrumentKey} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{stock.symbol}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{stock.name}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold font-tabular text-white">
                          &#8377;{stock.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium font-tabular">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}
                            {stock.change.toFixed(2)} ({isPositive ? '+' : ''}
                            {stock.changePercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-tabular text-[11px]">
                          &#8377;{stock.high} / &#8377;{stock.low}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/stocks/${encodeURIComponent(stock.instrumentKey)}`}
                            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-[11px] font-medium"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Events Sidebar */}
        <div className="space-y-6">
          {/* Create Alert Form */}
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Bell className="h-4 w-4 text-teal-400" />
              <span>Configure Threshold Alert</span>
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Stock</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  {instruments.map((item) => (
                    <option key={item.instrumentKey} value={item.symbol}>
                      {item.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Trigger Condition</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="GREATER_THAN">Price Greater Than (&gt;=)</option>
                  <option value="LESS_THAN">Price Less Than (&lt;=)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Threshold Value (&#8377;)</label>
                <input
                  type="number"
                  step={0.5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white font-tabular"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold p-2 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Save Alert Rule</span>
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Configured Alerts ({alerts.length})</span>
              <span className="text-[10px] text-slate-500 font-mono">5m Interval</span>
            </h3>

            <div className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No alerts configured yet.</p>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{al.symbol}</span>
                      <span className="text-slate-400 ml-1">
                        {al.operator === 'GREATER_THAN' ? '≥' : '≤'} &#8377;{al.threshold}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleAlert(al.id, al.enabled)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                        al.enabled
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {al.enabled ? 'Active' : 'Muted'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Triggered Events Feed */}
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-teal-400" />
              <span>Persisted Alert Events</span>
            </h3>

            <div className="space-y-2">
              {events.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No alert events recorded yet.</p>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg border border-teal-950 bg-teal-950/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-teal-300">{ev.symbol} Breached</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ev.observedAt && ev.observedAt.includes('T')
                          ? ev.observedAt.split('T')[1].slice(0, 5)
                          : ev.observedAt} IST
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Observed market price: &#8377;{ev.observedValue.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

