import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AlertRule, AlertEvent, Quote, Instrument } from '../types/market';
import { StatusBadge } from '../components/ui/StatusBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchApi } from '../lib/api';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [status, setStatus] = useState<'LIVE' | 'DEMO'>('LIVE');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  // New alert form
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [operator, setOperator] = useState<'GREATER_THAN' | 'LESS_THAN'>('GREATER_THAN');
  const [threshold, setThreshold] = useState<number>(3100);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalMessage, setEvalMessage] = useState<string | null>(null);

  const fetchAlertsData = async () => {
    try {
      setLoading(true);
      const [alertsData, marketData, instData] = await Promise.all([
        fetchApi<{ rules?: AlertRule[]; alerts?: AlertRule[]; events?: AlertEvent[]; status?: 'LIVE' | 'DEMO' }>('/alerts/'),
        fetchApi<{ allTracked?: Quote[] }>('/market/overview/'),
        fetchApi<Instrument[]>('/instruments/search/'),
      ]);

      setAlerts(alertsData.rules || alertsData.alerts || []);
      setEvents(alertsData.events || []);
      setStatus(alertsData.status || 'LIVE');

      const quoteMap: Record<string, Quote> = {};
      for (const q of marketData.allTracked || []) {
        quoteMap[q.symbol] = q;
      }
      setQuotes(quoteMap);
      setInstruments(instData.filter((i) => !i.isIndex));
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
      });
    }
    fetchAlertsData();
  }, []);

  // Update default threshold when selected symbol changes
  useEffect(() => {
    const quote = quotes[selectedSymbol];
    if (quote) {
      const suggested = operator === 'GREATER_THAN'
        ? Math.ceil(quote.lastPrice * 1.03)
        : Math.floor(quote.lastPrice * 0.97);
      setThreshold(suggested);
    }
  }, [selectedSymbol, operator, quotes]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const inst = instruments.find((i) => i.symbol === selectedSymbol) || {
      instrumentKey: `NSE_EQ|${selectedSymbol}`,
      symbol: selectedSymbol,
    };

    try {
      setSubmitting(true);
      await fetchApi('/alerts/', {
        method: 'POST',
        body: JSON.stringify({
          instrumentKey: inst.instrumentKey,
          symbol: inst.symbol,
          operator,
          threshold: Number(threshold),
        }),
      });

      await fetchAlertsData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAlert = async (id: string, currentEnabled: boolean) => {
    try {
      await fetchApi('/alerts/', {
        method: 'PATCH',
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !currentEnabled } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await fetchApi('/alerts/', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      setEvalMessage(null);
      const data = await fetchApi<{ evaluated: number; triggeredCount: number }>('/alerts/evaluate/', {
        method: 'POST',
      });
      setEvalMessage(
        `Evaluated ${data.evaluated} alerts. ${data.triggeredCount} threshold breaches recorded.`
      );
      await fetchAlertsData();
    } catch {
      setEvalMessage('Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bell className="h-6 w-6 text-teal-400" />
              <span>Price Alerts & Notifications</span>
            </h1>
            <StatusBadge status={status} size="md" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time threshold monitors for Indian equities. Receive in-app notifications on price breaches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 rounded-lg bg-teal-500/10 border border-teal-500/30 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition cursor-pointer"
          >
            {evaluating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 text-teal-400" />
            )}
            <span>Evaluate Snapshot Now</span>
          </button>
        </div>
      </div>

      {evalMessage && (
        <div className="rounded-lg border border-teal-800/80 bg-teal-950/20 px-4 py-3 text-xs text-teal-300 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-400" />
          <span>{evalMessage}</span>
        </div>
      )}

      {/* Guest Notice if not authenticated */}
      {!user && (
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-white">Active Guest Session</span>
              <p className="text-slate-400">
                Real-time price alerts are active for this browser session. Sign in to sync your alerts and notifications permanently across all devices.
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="shrink-0 rounded-lg bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-400 transition text-center"
          >
            Sign In / Register
          </Link>
        </div>
      )}

      {/* Two Column Layout: Alert Form + Triggered Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create New Alert Form */}
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-5 lg:col-span-1 h-fit">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-400" />
            <span>Create New Alert</span>
          </h2>

          <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Stock / Instrument</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white text-xs focus:border-teal-500 focus:outline-none"
              >
                {instruments.map((inst) => (
                  <option key={inst.instrumentKey} value={inst.symbol}>
                    {inst.symbol} — {inst.name}
                  </option>
                ))}
              </select>
              {quotes[selectedSymbol] && (
                <div className="mt-1.5 text-[11px] text-slate-400 flex justify-between font-tabular">
                  <span>Current LTP:</span>
                  <span className="text-white font-semibold">
                    ₹{quotes[selectedSymbol].lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Trigger Condition</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as 'GREATER_THAN' | 'LESS_THAN')}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="GREATER_THAN">Price rises above (≥)</option>
                <option value="LESS_THAN">Price drops below (≤)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Target Threshold (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-2 text-white text-xs font-tabular focus:border-teal-500 focus:outline-none"
                  placeholder="e.g. 3100.00"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || threshold <= 0}
              className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Setting Alert...' : 'Set Price Alert'}
            </button>
          </form>

          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-teal-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Snapshot Intervals</span>
            </div>
            <p>
              Alert conditions evaluate against market quotes during Indian market sessions (09:15 – 15:30 IST).
            </p>
          </div>
        </div>

        {/* Right Column: Active Alerts List & Trigger Log */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Alerts Table */}
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="h-4 w-4 text-teal-400" />
                <span>Active Alerts ({alerts.length})</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {alerts.filter((a) => a.enabled).length} Enabled
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                <span>Loading price alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                No active alerts found. Create an alert from the form on the left.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-hidden rounded-lg border border-slate-800">
                {alerts.map((alert) => {
                  const currentQuote = quotes[alert.symbol];
                  const currentPrice = currentQuote?.lastPrice;
                  const diffPercent = currentPrice
                    ? (((currentPrice - alert.threshold) / alert.threshold) * 100).toFixed(2)
                    : null;

                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/70 transition gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/stocks/${encodeURIComponent(alert.instrumentKey)}`}
                            className="font-bold text-white hover:text-teal-400 transition"
                          >
                            {alert.symbol}
                          </Link>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                              alert.operator === 'GREATER_THAN'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                            }`}
                          >
                            {alert.operator === 'GREATER_THAN' ? '≥ GREATER THAN' : '≤ LESS THAN'}
                          </span>
                          {!alert.enabled && (
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                              Paused
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 font-tabular">
                          <span>
                            Target: <strong className="text-white">₹{alert.threshold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          </span>
                          {currentPrice && (
                            <span>
                              Current: ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                              <span className={Number(diffPercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                ({Number(diffPercent) >= 0 ? '+' : ''}{diffPercent}%)
                              </span>
                            </span>
                          )}
                          {alert.lastTriggeredAt && (
                            <span className="text-amber-400 text-[11px]">
                              Triggered: {alert.lastTriggeredAt.split('T')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <button
                          onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                            alert.enabled
                              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {alert.enabled ? 'Active' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="rounded-md p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Triggered Events Feed */}
          <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Triggered Alert Events ({events.length})</span>
              </h2>
            </div>

            {events.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No alert breaches recorded yet. Trigger events will appear here when market prices cross your thresholds.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{event.symbol}</span>
                          <span className="text-[11px] font-normal text-slate-400">breached threshold</span>
                        </div>
                        <div className="text-slate-400 font-tabular mt-0.5">
                          Observed LTP: <strong className="text-emerald-400">₹{event.observedValue.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-slate-500 text-[11px] font-mono self-end sm:self-auto">
                      {event.observedAt ? event.observedAt.replace('T', ' ').slice(0, 19) : event.createdAt.slice(0, 19)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
