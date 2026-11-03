import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpstoxProvider } from '../lib/data-provider/upstox-provider';
import { serverCache } from '../lib/data-provider/cache';

describe('UpstoxProvider & Phase P2 Data Adapter Specification', () => {
  beforeEach(() => {
    serverCache.clear();
    vi.restoreAllMocks();
  });

  it('should identify unconfigured state when token is empty', () => {
    const provider = new UpstoxProvider({ analyticsToken: '' });
    expect(provider.isConfigured).toBe(false);
  });

  it('should identify configured state when token is provided', () => {
    const provider = new UpstoxProvider({ analyticsToken: 'mock-upstox-token-12345' });
    expect(provider.isConfigured).toBe(true);
  });

  it('should gracefully fall back to DemoProvider when unconfigured', async () => {
    const provider = new UpstoxProvider({ analyticsToken: '', enableFallback: true });
    const overview = await provider.getMarketOverview();

    expect(overview.status).toBe('DEMO');
    expect(overview.indices.length).toBe(3);
    expect(overview.allTracked.length).toBe(20);
    expect(overview.indices[0].source).toContain('DEMO');
  });

  it('should never expose token secrets in quote responses or errors', async () => {
    const secretToken = 'super-secret-token-xyz999';
    const provider = new UpstoxProvider({ analyticsToken: secretToken, enableFallback: true });

    // Mock fetch failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error with upstream Upstox server'));

    const quotes = await provider.getQuotes(['NSE_EQ|INE002A01018']);
    expect(quotes.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(quotes);
    expect(serialized).not.toContain(secretToken);
  });

  it('should utilize server-side in-memory cache on repeated quote requests', async () => {
    const provider = new UpstoxProvider({ analyticsToken: '', enableFallback: true });

    const firstRun = await provider.getQuotes(['NSE_EQ|INE002A01018']);
    const statsBefore = serverCache.getStats();

    const secondRun = await provider.getQuotes(['NSE_EQ|INE002A01018']);
    const statsAfter = serverCache.getStats();

    expect(firstRun[0].lastPrice).toEqual(secondRun[0].lastPrice);
    expect(statsAfter.hits).toBeGreaterThan(statsBefore.hits);
  });

  it('should correctly map authorized Upstox V3 mock payload with colon format and prev_close_price', async () => {
    const provider = new UpstoxProvider({
      analyticsToken: 'mock-valid-token',
      baseUrl: 'https://mock.upstox.com/v3',
      enableFallback: false,
    });

    const mockUpstoxResponse = {
      status: 'success',
      data: {
        'NSE_EQ:RELIANCE': {
          instrument_token: 'NSE_EQ|INE002A01018',
          last_price: 3012.50,
          prev_close_price: 2980.00,
          volume: 5200000,
          year_high: 3200.00,
          year_low: 2400.00,
          ohlc: {
            open: 2985.00,
            high: 3030.00,
            low: 2975.00,
            close: 2980.00,
            ts: 1730368800000, // numeric millisecond timestamp
          },
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpstoxResponse,
    });

    const quotes = await provider.getQuotes(['NSE_EQ|INE002A01018']);
    expect(quotes.length).toBe(1);

    const quote = quotes[0];
    expect(quote.symbol).toBe('RELIANCE');
    expect(quote.lastPrice).toBe(3012.50);
    expect(quote.previousClose).toBe(2980.00);
    expect(quote.change).toBe(32.50);
    expect(quote.changePercent).toBeCloseTo(1.09, 1);
    expect(quote.volume).toBe(5200000);
    expect(quote.yearHigh).toBe(3200.00);
    expect(quote.yearLow).toBe(2400.00);
    expect(quote.source).toContain('Upstox');
  });

  it('should correctly parse Upstox V2 historical candles response into chronological order', async () => {
    const provider = new UpstoxProvider({
      analyticsToken: 'mock-valid-token',
      enableFallback: false,
    });

    // Upstox V2 format returns newest candle first: [timestamp, open, high, low, close, volume, oi]
    const mockCandlesResponse = {
      status: 'success',
      data: {
        candles: [
          ['2026-10-30T00:00:00+05:30', 3000, 3050, 2990, 3040, 100000, 0], // Oct 30 (newest)
          ['2026-10-29T00:00:00+05:30', 2980, 3010, 2970, 2995, 95000, 0],  // Oct 29
          ['2026-10-28T00:00:00+05:30', 2950, 2990, 2940, 2975, 88000, 0],  // Oct 28 (oldest)
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCandlesResponse,
    });

    const candles = await provider.getHistoricalCandles('NSE_EQ|INE002A01018', 30);
    expect(candles.length).toBe(3);

    // Should be chronological (oldest first)
    expect(candles[0].timestamp).toBe('2026-10-28');
    expect(candles[0].close).toBe(2975);
    expect(candles[2].timestamp).toBe('2026-10-30');
    expect(candles[2].close).toBe(3040);
  });

  it('should normalize Upstox news API response', async () => {
    const provider = new UpstoxProvider({
      analyticsToken: 'mock-valid-token',
      enableFallback: false,
    });

    const mockNewsResponse = {
      status: 'success',
      data: [
        {
          news_id: 'news-987',
          title: 'Reliance Retail Expands Store Footprint Across Tier-2 Cities',
          publisher: 'Mint Financial',
          published_at: '2026-10-30T10:00:00Z',
          link: 'https://livemint.com/news/1',
          symbols: ['NSE_EQ|INE002A01018'],
          summary: 'Reliance Retail added 120 new store locations in Q2.',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNewsResponse,
    });

    const news = await provider.getNews('NSE_EQ|INE002A01018');
    expect(news.length).toBe(1);
    expect(news[0].title).toContain('Reliance Retail');
    expect(news[0].publisher).toBe('Mint Financial');
    expect(news[0].sourceUrl).toBe('https://livemint.com/news/1');
  });

  it('should gracefully fallback to Demo fixtures when Upstox returns HTTP 401 or 500 error', async () => {
    const provider = new UpstoxProvider({
      analyticsToken: 'expired-or-invalid-token',
      enableFallback: true,
    });

    // Mock 401 Unauthorized from Upstox
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const quotes = await provider.getQuotes(['NSE_EQ|INE002A01018']);
    expect(quotes.length).toBe(1);
    expect(quotes[0].symbol).toBe('RELIANCE');
    expect(quotes[0].source).toContain('DEMO');
    expect(quotes[0].status).toBe('DEMO');
  });
});
