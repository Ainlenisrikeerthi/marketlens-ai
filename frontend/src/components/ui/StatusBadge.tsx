import React from 'react';
import { DataStatus } from '../../types/market';

interface StatusBadgeProps {
  status: DataStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles: Record<DataStatus, { bg: string; dot: string; label: string }> = {
    DEMO: {
      bg: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'REAL-TIME',
    },
    LIVE: {
      bg: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'LIVE',
    },
    DELAYED: {
      bg: 'bg-blue-950/40 border-blue-600/40 text-blue-300',
      dot: 'bg-blue-400',
      label: 'DELAYED 15m',
    },
    CLOSED: {
      bg: 'bg-slate-800/60 border-slate-700 text-slate-400',
      dot: 'bg-slate-500',
      label: 'MARKET CLOSED',
    },
    STALE: {
      bg: 'bg-rose-950/40 border-rose-600/40 text-rose-300',
      dot: 'bg-rose-400',
      label: 'STALE DATA',
    },
  };

  const current = styles[status] || styles.LIVE;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${sizeClasses}`}
      title={`Data origin status: ${current.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
}
