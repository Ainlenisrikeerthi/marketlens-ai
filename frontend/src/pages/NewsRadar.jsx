import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  ExternalLink,
  Info,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  MinusCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { fetchApi } from '../lib/api';

export function NewsRadarPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSentiment, setSelectedSentiment] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/news/');
      const items = Array.isArray(data) ? data : (data.news || []);
      setNews(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve news stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const sentimentPill = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 text-xs font-medium text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            <span>Positive</span>
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 text-xs font-medium text-rose-300">
            <AlertCircle className="h-3 w-3" />
            <span>Negative</span>
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
            <MinusCircle className="h-3 w-3" />
            <span>Neutral</span>
          </span>
        );
      case 'unclear':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 text-xs font-medium text-amber-300">
            <HelpCircle className="h-3 w-3" />
            <span>Unclear Evidence</span>
          </span>
        );
    }
  };

  const filteredNews = news.filter((item) => {
    const matchesSentiment =
      selectedSentiment === 'ALL' || item.sentiment === selectedSentiment;
    const matchesSearch =
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.publisher.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesSentiment && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-teal-400" />
              <span>News &amp; Sentiment Radar</span>
            </h1>
            <StatusBadge status="LIVE" size="md" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded market news aggregation, entity mapping, and AI sentiment classification.
          </p>
        </div>

        <button
          onClick={fetchNews}
          className="flex items-center gap-2 self-start md:self-auto rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
          <span>Refresh News Stream</span>
        </button>
      </div>

      {/* Disclaimers Alert Banner */}
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <p>
          <strong className="text-amber-300 font-semibold">Important Sentiment Notice:</strong> Article sentiment represents linguistic classification of published news statements. It is <strong>not</strong> statistical proof of subsequent price momentum or directional returns. Never make capital commitments solely on news classification.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Sentiment Filter Tabs */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-1 overflow-x-auto">
          {['ALL', 'positive', 'negative', 'neutral', 'unclear'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSentiment(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition whitespace-nowrap cursor-pointer ${
                selectedSentiment === s
                  ? 'bg-slate-800 text-teal-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'All Sentiments' : s === 'unclear' ? 'Unclear' : s}
            </button>
          ))}
        </div>

        {/* Text Filter Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search headline or publisher..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* News Feed List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-slate-400 text-xs">
          <RefreshCw className="h-6 w-6 text-teal-400 animate-spin" />
          <span>Fetching attributed news items...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800 bg-rose-950/20 p-6 text-center text-rose-400 text-xs">
          {error}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0e1424] p-12 text-center text-slate-400 text-xs">
          No news items match the selected sentiment or search filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-teal-400">{item.publisher}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.publishedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white leading-snug hover:text-teal-300 transition-colors">
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start">
                  {sentimentPill(item.sentiment)}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
                    title="Read original source"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {item.summary && (
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                  <strong className="text-slate-400 font-medium">Summary: </strong>
                  {item.summary}
                </p>
              )}

              {item.explanation && (
                <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <span className="text-teal-400 font-medium">AI Rationale:</span>
                  <span>{item.explanation}</span>
                </div>
              )}

              {/* Mapped Instruments */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
                <span className="text-slate-500">Related Instruments:</span>
                {item.instrumentKeys.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 font-mono"
                  >
                    {k.split('|')[1] || k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

