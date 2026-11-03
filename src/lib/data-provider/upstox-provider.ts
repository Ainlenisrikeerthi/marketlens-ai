import {
  Instrument,
  Quote,
  Candle,
  NewsItem,
  StockAnalysis,
  MarketOverview,
  BacktestParameters,
  BacktestResult,
} from '@/types/market';
import { MarketDataProvider } from './index';
import { DemoProvider, CURATED_INSTRUMENTS } from './demo-provider';
import { serverCache } from './cache';
import { getIndianMarketSession, determineDataStatus } from './market-hours';
import { generateStockResearch } from '../ai/stock-research';
import { enrichNewsWithSentiment } from '../ai/news-sentiment';

export interface UpstoxConfig {
  analyticsToken?: string;
  baseUrl?: string;
  enableFallback?: boolean;
  timeoutMs?: number;
}

export class UpstoxProvider implements MarketDataProvider {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly demoFallback: DemoProvider;
  private readonly enableFallback: boolean;
  private readonly timeoutMs: number;

  constructor(config?: UpstoxConfig) {
    this.token = config?.analyticsToken || process.env.UPSTOX_ANALYTICS_TOKEN || '';
    this.baseUrl = config?.baseUrl || 'https://api.upstox.com/v3';
    this.demoFallback = new DemoProvider();
    this.enableFallback = config?.enableFallback ?? true;
    this.timeoutMs = config?.timeoutMs ?? 5000;
  }

  get isConfigured(): boolean {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  private getAuthHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Safe fetch with timeout and token stripping on error.
   */
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getAuthHeaders(),
          ...(options?.headers || {}),
        },
      });
      return res;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Upstox API request timed out after ' + this.timeoutMs + 'ms');
      }
      const safeMsg = err instanceof Error ? err.message.replace(this.token, '[REDACTED]') : 'Network failure';
      throw new Error(safeMsg);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAllInstruments(): Promise<Instrument[]> {
    return [...CURATED_INSTRUMENTS];
  }

  async getInstrument(key: string): Promise<Instrument | null> {
    return this.demoFallback.getInstrument(key);
  }

  async searchInstruments(query: string): Promise<Instrument[]> {
    return this.demoFallback.searchInstruments(query);
  }

  async getQuote(instrumentKey: string): Promise<Quote | null> {
    const quotes = await this.getQuotes([instrumentKey]);
    return quotes[0] || null;
  }

  async getQuotes(instrumentKeys: string[]): Promise<Quote[]> {
    if (instrumentKeys.length === 0) return [];

    const cacheKey = `upstox_quotes_${instrumentKeys.slice().sort().join(',')}`;
    const cached = serverCache.get<Quote[]>(cacheKey);
    if (cached) return cached;

    // If Upstox token is not configured or blank, fallback to DemoProvider directly
    if (!this.isConfigured) {
      if (this.enableFallback) {
        const fallbackQuotes = await this.demoFallback.getQuotes(instrumentKeys);
        const session = getIndianMarketSession();
        const ttl = session.isOpen ? 10 : 60;
        serverCache.set(cacheKey, fallbackQuotes, ttl);
        return fallbackQuotes;
      }
      throw new Error('Upstox analytics token is not configured.');
    }

    try {
      // Upstox v3 Market Quotes API: /market-quote/quotes?instrument_key=KEY1,KEY2
      // Each key may contain special characters like '|' or spaces, so encode each key individually
      const joinedKeys = instrumentKeys.map((k) => encodeURIComponent(k)).join(',');
      const endpoint = `${this.baseUrl}/market-quote/quotes?instrument_key=${joinedKeys}`;

      const res = await this.safeFetch(endpoint, {
        next: { revalidate: 5 },
      });

      if (!res.ok) {
        if (this.enableFallback) {
          return this.demoFallback.getQuotes(instrumentKeys);
        }
        throw new Error(`Upstox API responded with HTTP ${res.status}`);
      }

      const json = await res.json();
      const data: Record<string, any> = json.data || {};

      const results: Quote[] = [];
      const session = getIndianMarketSession();

      for (const key of instrumentKeys) {
        const inst = await this.getInstrument(key);
        if (!inst) continue;

        // Upstox keys in response can be in multiple formats:
        // 1. Exact input key: "NSE_EQ|INE002A01018"
        // 2. Colon replacement: "NSE_EQ:INE002A01018"
        // 3. Exchange + symbol: "NSE_EQ:RELIANCE" or "NSE_INDEX:Nifty 50"
        const keyColon = inst.instrumentKey.replace('|', ':');
        const symbolKey = `${inst.exchange === 'INDEX' ? 'NSE_INDEX' : `${inst.exchange}_EQ`}:${inst.symbol}`;
        const upperSymbolKey = `${inst.exchange === 'INDEX' ? 'NSE_INDEX' : `${inst.exchange}_EQ`}:${inst.symbol.toUpperCase()}`;

        const item =
          data[inst.instrumentKey] ||
          data[keyColon] ||
          data[symbolKey] ||
          data[upperSymbolKey] ||
          data[inst.symbol] ||
          Object.entries(data).find(
            ([k]) =>
              k.endsWith(`:${inst.symbol}`) ||
              k.endsWith(`|${inst.symbol}`) ||
              k.endsWith(`:${inst.symbol.toUpperCase()}`)
          )?.[1];

        if (item) {
          const lastPrice = Number(item.last_price ?? item.lastPrice ?? 0);
          const previousClose = Number(
            item.prev_close_price ??
              item.previous_close_price ??
              item.ohlc?.close ??
              item.previousClose ??
              lastPrice
          );
          const change = Number((lastPrice - previousClose).toFixed(2));
          const changePercent =
            previousClose !== 0 ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

          // Parse timestamp safely
          let asOf = session.istTimeString;
          const rawTs = item.timestamp ?? item.ohlc?.ts;
          if (rawTs) {
            if (typeof rawTs === 'number') {
              asOf = new Date(rawTs).toISOString();
            } else if (typeof rawTs === 'string') {
              asOf = rawTs;
            }
          }

          const status = determineDataStatus(asOf, false);

          results.push({
            instrumentKey: inst.instrumentKey,
            symbol: inst.symbol,
            name: inst.name,
            lastPrice,
            change,
            changePercent,
            volume: Number(item.volume ?? item.ohlc?.volume ?? 0),
            high: item.ohlc?.high ? Number(item.ohlc.high) : undefined,
            low: item.ohlc?.low ? Number(item.ohlc.low) : undefined,
            open: item.ohlc?.open ? Number(item.ohlc.open) : undefined,
            previousClose,
            yearHigh: item.year_high ? Number(item.year_high) : undefined,
            yearLow: item.year_low ? Number(item.year_low) : undefined,
            asOf,
            source: 'Upstox Analytics Token API (Authorized)',
            status,
          });
        } else if (this.enableFallback) {
          // If a specific symbol was not returned, supplement from fallback fixture
          const fallbackQuotes = await this.demoFallback.getQuotes([inst.instrumentKey]);
          if (fallbackQuotes[0]) {
            results.push(fallbackQuotes[0]);
          }
        }
      }

      // Freshness caching: 10s during active trading, 60s when market is closed
      const ttl = session.isOpen ? 10 : 60;
      serverCache.set(cacheKey, results, ttl);

      return results;
    } catch (err: unknown) {
      if (this.enableFallback) {
        return this.demoFallback.getQuotes(instrumentKeys);
      }
      const message = err instanceof Error ? err.message : 'Market data request failed';
      throw new Error(message);
    }
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const cacheKey = 'upstox_market_overview';
    const cached = serverCache.get<MarketOverview>(cacheKey);
    if (cached) return cached;

    if (!this.isConfigured) {
      if (this.enableFallback) {
        return this.demoFallback.getMarketOverview();
      }
      throw new Error('Upstox analytics token is not configured.');
    }

    try {
      const allInstruments = await this.getAllInstruments();
      const allQuotes = await this.getQuotes(allInstruments.map((i) => i.instrumentKey));

      const indices = allQuotes.filter((q) =>
        ['NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty Bank'].includes(q.instrumentKey)
      );

      const equities = allQuotes.filter(
        (q) => !['NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty Bank'].includes(q.instrumentKey)
      );

      // Strictly sort top gainers and losers within the 20 tracked universe instruments
      const sortedMovers = [...equities].sort((a, b) => b.changePercent - a.changePercent);
      const topGainers = sortedMovers.slice(0, 5);
      const topLosers = sortedMovers.slice(-5).reverse();

      const session = getIndianMarketSession();
      const overviewStatus = session.recommendedStatus;

      const overview: MarketOverview = {
        indices,
        topGainers,
        topLosers,
        allTracked: equities,
        asOf: session.istTimeString,
        status: overviewStatus,
        note: 'Authorized Upstox Market Data. Top gainers and losers are strictly computed within the 20 tracked universe instruments.',
      };

      const ttl = session.isOpen ? 10 : 60;
      serverCache.set(cacheKey, overview, ttl);

      return overview;
    } catch {
      if (this.enableFallback) {
        return this.demoFallback.getMarketOverview();
      }
      throw new Error('Failed to generate market overview from Upstox');
    }
  }

  async getHistoricalCandles(instrumentKey: string, days: number = 60): Promise<Candle[]> {
    const cacheKey = `upstox_candles_${instrumentKey}_${days}`;
    const cached = serverCache.get<Candle[]>(cacheKey);
    if (cached) return cached;

    if (!this.isConfigured) {
      if (this.enableFallback) {
        return this.demoFallback.getHistoricalCandles(instrumentKey, days);
      }
      throw new Error('Upstox analytics token is not configured.');
    }

    try {
      const toDate = new Date().toISOString().split('T')[0];
      const fromDateObj = new Date();
      fromDateObj.setDate(fromDateObj.getDate() - (days + 35)); // buffer for weekends & trading holidays
      const fromDate = fromDateObj.toISOString().split('T')[0];

      // Upstox v2 Historical Candles API:
      // /v2/historical-candle/{instrument_key}/day/{to_date}/{from_date}
      const endpoint = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(
        instrumentKey
      )}/day/${toDate}/${fromDate}`;

      const res = await this.safeFetch(endpoint);

      if (!res.ok) {
        if (this.enableFallback) {
          return this.demoFallback.getHistoricalCandles(instrumentKey, days);
        }
        throw new Error(`Upstox Historical API responded with ${res.status}`);
      }

      const json = await res.json();
      const rawCandles = json.data?.candles || [];

      // Upstox candle format: [timestamp, open, high, low, close, volume, open_interest]
      const candles: Candle[] = rawCandles
        .map((c: [string, number, number, number, number, number]) => ({
          timestamp: typeof c[0] === 'string' ? c[0].split('T')[0] : new Date(c[0]).toISOString().split('T')[0],
          open: Number(c[1]),
          high: Number(c[2]),
          low: Number(c[3]),
          close: Number(c[4]),
          volume: Number(c[5]),
        }))
        .reverse() // Upstox returns newest first; reverse for chronological order
        .slice(-days);

      if (candles.length === 0 && this.enableFallback) {
        return this.demoFallback.getHistoricalCandles(instrumentKey, days);
      }

      // Cache candles for 1 hour (historical daily bars change at most once per day)
      serverCache.set(cacheKey, candles, 3600);
      return candles;
    } catch {
      if (this.enableFallback) {
        return this.demoFallback.getHistoricalCandles(instrumentKey, days);
      }
      throw new Error('Failed to retrieve historical candles from Upstox');
    }
  }

  async getNews(instrumentKey?: string): Promise<NewsItem[]> {
    const cacheKey = `upstox_news_${instrumentKey || 'ALL'}`;
    const cached = serverCache.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    if (!this.isConfigured) {
      if (this.enableFallback) {
        return this.demoFallback.getNews(instrumentKey);
      }
      throw new Error('Upstox analytics token is not configured.');
    }

    try {
      // Upstox News API: /v2/news/sub-category?sub_category=EQUITY
      const endpoint = `https://api.upstox.com/v2/news/sub-category?sub_category=EQUITY`;
      const res = await this.safeFetch(endpoint);

      if (!res.ok) {
        if (this.enableFallback) {
          return this.demoFallback.getNews(instrumentKey);
        }
        throw new Error(`Upstox News API returned ${res.status}`);
      }

      const json = await res.json();
      const rawItems = json.data || [];

      // Normalize into NewsItem
      const news: NewsItem[] = rawItems.map((item: Record<string, any>, idx: number) => ({
        id: (item.news_id as string) || `upstox-news-${idx}`,
        title: (item.title as string) || (item.headline as string) || 'Market News Update',
        publisher: (item.publisher as string) || 'Upstox Financial Wire',
        publishedAt: (item.published_at as string) || new Date().toISOString(),
        sourceUrl: (item.link as string) || (item.source_url as string) || 'https://upstox.com',
        instrumentKeys: (item.symbols as string[]) || [],
        sentiment: 'neutral',
        summary: (item.summary as string) || (item.description as string) || '',
      }));

      const enrichedNews = enrichNewsWithSentiment(news);

      // Cache for 5 minutes (300s)
      serverCache.set(cacheKey, enrichedNews, 300);

      if (instrumentKey) {
        return enrichedNews.filter((n) =>
          n.instrumentKeys.some((k) => k.toLowerCase() === instrumentKey.toLowerCase())
        );
      }

      return enrichedNews;
    } catch {
      if (this.enableFallback) {
        return this.demoFallback.getNews(instrumentKey);
      }
      throw new Error('Failed to fetch news from Upstox');
    }
  }

  async getStockAnalysis(instrumentKey: string): Promise<StockAnalysis> {
    const inst = await this.getInstrument(instrumentKey);
    if (!inst) {
      throw new Error(`Instrument not found: ${instrumentKey}`);
    }
    const candles = await this.getHistoricalCandles(instrumentKey, 60);
    const quote = await this.getQuote(instrumentKey);

    return generateStockResearch({
      instrument: inst,
      quote,
      candles,
    });
  }

  async runBacktest(params: BacktestParameters): Promise<BacktestResult> {
    return this.demoFallback.runBacktest(params);
  }
}
