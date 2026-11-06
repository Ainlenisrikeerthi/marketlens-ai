import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

/**
 * TradingView lightweight-charts v4 candlestick chart component.
 * Uses chart.addCandlestickSeries() — the v4 API (not v5's addSeries()).
 *
 * @param {{ candles: Array, symbol?: string, height?: number }} props
 */
export function TradingViewChart({ candles, symbol = 'STOCK', height = 420 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [timeframe, setTimeframe] = useState('ALL');
  const [activeLegend, setActiveLegend] = useState(null);

  // Filter candles based on timeframe
  const filteredCandles = useMemo(() => {
    if (timeframe === '1M') return candles.slice(-22);
    if (timeframe === '3M') return candles.slice(-60);
    return candles;
  }, [candles, timeframe]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0e1424' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        vertLine: {
          color: '#14b8a6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#14b8a6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0f172a',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
      },
      width: container.clientWidth || 600,
      height: height,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const formattedCandles = filteredCandles.map((c) => ({
      time: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(formattedCandles);

    // SMA 20 Overlay Series
    let sma20Series = null;
    if (showSMA20) {
      sma20Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'SMA 20',
      });

      const sma20Data = [];
      for (let i = 19; i < filteredCandles.length; i++) {
        const slice = filteredCandles.slice(i - 19, i + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        sma20Data.push({
          time: filteredCandles[i].timestamp,
          value: Number((sum / 20).toFixed(2)),
        });
      }
      sma20Series.setData(sma20Data);
    }

    // SMA 50 Overlay Series
    let sma50Series = null;
    if (showSMA50) {
      sma50Series = chart.addLineSeries({
        color: '#38bdf8',
        lineWidth: 2,
        title: 'SMA 50',
      });

      const sma50Data = [];
      for (let i = 49; i < filteredCandles.length; i++) {
        const slice = filteredCandles.slice(i - 49, i + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        sma50Data.push({
          time: filteredCandles[i].timestamp,
          value: Number((sum / 50).toFixed(2)),
        });
      }
      sma50Series.setData(sma50Data);
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setActiveLegend(null);
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setActiveLegend({
          time: String(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [mounted, filteredCandles, showSMA20, showSMA50, height]);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-[#0e1424] rounded-lg border border-slate-800 text-slate-500 text-sm animate-pulse"
      >
        Loading interactive chart for {symbol}...
      </div>
    );
  }

  const latest = filteredCandles[filteredCandles.length - 1];
  const displayLegend = activeLegend || (latest ? {
    time: latest.timestamp,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close,
  } : null);

  const timeframes = ['1M', '3M', 'ALL'];

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0e1424] shadow-lg">
      {/* Top Toolbar & Legend */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-white tracking-wide">{symbol}</span>
          
          {/* Timeframe switchers */}
          <div className="flex items-center rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Overlays Toggle */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-[11px]">
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                showSMA20
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                  : 'border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
              SMA 20
            </button>

            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                showSMA50
                  ? 'border-sky-500/60 bg-sky-500/10 text-sky-400'
                  : 'border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 inline-block" />
              SMA 50
            </button>
          </div>
        </div>

        {/* OHLC Bar Legend */}
        {displayLegend && (
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>Date: <span className="text-slate-200">{displayLegend.time}</span></span>
            <span>O: <span className="text-white">&#8377;{displayLegend.open.toFixed(2)}</span></span>
            <span>H: <span className="text-white">&#8377;{displayLegend.high.toFixed(2)}</span></span>
            <span>L: <span className="text-white">&#8377;{displayLegend.low.toFixed(2)}</span></span>
            <span>C: <span className={displayLegend.close >= displayLegend.open ? 'text-emerald-400' : 'text-rose-400'}>
              &#8377;{displayLegend.close.toFixed(2)}
            </span></span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
}

