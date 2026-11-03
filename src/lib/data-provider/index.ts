import {
  Instrument,
  Quote,
  Candle,
  NewsItem,
  StockAnalysis,
  MarketOverview,
  BacktestParameters,
  BacktestResult,
  DataStatus,
} from '@/types/market';
import { demoProvider } from './demo-provider';
import { UpstoxProvider } from './upstox-provider';
import { getIndianMarketSession } from './market-hours';

export interface MarketDataProvider {
  getMarketOverview(): Promise<MarketOverview>;
  searchInstruments(query: string): Promise<Instrument[]>;
  getInstrument(key: string): Promise<Instrument | null>;
  getAllInstruments(): Promise<Instrument[]>;
  getQuote(instrumentKey: string): Promise<Quote | null>;
  getQuotes(instrumentKeys: string[]): Promise<Quote[]>;
  getHistoricalCandles(instrumentKey: string, days?: number): Promise<Candle[]>;
  getNews(instrumentKey?: string): Promise<NewsItem[]>;
  getStockAnalysis(instrumentKey: string): Promise<StockAnalysis>;
  runBacktest(params: BacktestParameters): Promise<BacktestResult>;
}

/**
 * Factory function to acquire the active MarketDataProvider.
 * If UPSTOX_ANALYTICS_TOKEN is set, returns UpstoxProvider (with automatic Demo fallback).
 * Otherwise, returns the standalone DemoProvider.
 */
export function getMarketDataProvider(): MarketDataProvider {
  const token = process.env.UPSTOX_ANALYTICS_TOKEN;
  if (token && token.trim().length > 0) {
    return new UpstoxProvider({ analyticsToken: token.trim(), enableFallback: true });
  }
  return demoProvider;
}

export function getActiveProviderType(): 'UPSTOX' | 'DEMO' {
  const token = process.env.UPSTOX_ANALYTICS_TOKEN;
  return Boolean(token && token.trim().length > 0) ? 'UPSTOX' : 'DEMO';
}

export function getDataProviderStatus(): {
  provider: 'UPSTOX' | 'DEMO';
  isAuthorized: boolean;
  recommendedStatus: DataStatus;
  asOf: string;
} {
  const session = getIndianMarketSession();
  const isUpstox = getActiveProviderType() === 'UPSTOX';
  return {
    provider: isUpstox ? 'UPSTOX' : 'DEMO',
    isAuthorized: isUpstox,
    recommendedStatus: session.recommendedStatus,
    asOf: session.istTimeString,
  };
}

// Global default provider instance
export const defaultProvider = getMarketDataProvider();

export * from './demo-provider';
export * from './upstox-provider';
export * from './cache';
export * from './market-hours';
