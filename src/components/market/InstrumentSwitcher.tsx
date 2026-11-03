'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Instrument } from '@/types/market';

interface InstrumentSwitcherProps {
  currentKey: string;
  instruments: Instrument[];
}

export function InstrumentSwitcher({ currentKey, instruments }: InstrumentSwitcherProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value;
    if (selectedKey && selectedKey !== currentKey) {
      router.push(`/stocks/${encodeURIComponent(selectedKey)}`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="quick-switcher" className="text-xs text-slate-400 font-medium">
        Switch Instrument:
      </label>
      <div className="relative">
        <select
          id="quick-switcher"
          value={currentKey}
          onChange={handleChange}
          aria-label="Select an instrument to research"
          className="appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 pr-8 text-xs font-medium text-white hover:border-teal-500 focus:outline-none cursor-pointer"
        >
          {instruments.map((item) => (
            <option key={item.instrumentKey} value={item.instrumentKey}>
              {item.symbol} — {item.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
      </div>
    </div>
  );
}
