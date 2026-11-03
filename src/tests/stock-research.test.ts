import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStockResearch, GroundedResearchSchema } from '../lib/ai/stock-research';
import { Instrument, Candle, Quote } from '../types/market';
import { serverCache } from '../lib/data-provider/cache';

describe('Grounded AI Stock Research Specification (Phase P3)', () => {
  const mockInstrument: Instrument = {
    instrumentKey: 'NSE_EQ|INE002A01018',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Ltd.',
    currency: 'INR',
    sector: 'Energy & Conglomerate',
  };

  const mockQuote: Quote = {
    instrumentKey: 'NSE_EQ|INE002A01018',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    lastPrice: 3012.5,
    change: 32.5,
    changePercent: 1.09,
    volume: 5200000,
    previousClose: 2980.0,
    asOf: '2026-10-31T15:30:00+05:30',
    source: 'Verified Exchange Stream',
    status: 'DEMO',
  };

  const mockCandles: Candle[] = Array.from({ length: 60 }, (_, i) => ({
    timestamp: `2026-08-${String((i % 25) + 1).padStart(2, '0')}`,
    open: 2800 + i * 3,
    high: 2810 + i * 3,
    low: 2795 + i * 3,
    close: 2805 + i * 3,
    volume: 2000000,
  }));

  beforeEach(() => {
    serverCache.clear();
    vi.restoreAllMocks();
  });

  it('should generate schema-compliant research when API key is not configured (Deterministic Fallback)', async () => {
    // Ensure no API key
    delete process.env.ANTHROPIC_API_KEY;

    const analysis = await generateStockResearch({
      instrument: mockInstrument,
      quote: mockQuote,
      candles: mockCandles,
    });

    // Validate against GroundedResearchSchema
    const parseResult = GroundedResearchSchema.safeParse({
      summary: analysis.summary,
      observations: analysis.observations,
      risks: analysis.risks,
      uncertainties: analysis.uncertainties,
      sources: analysis.sources,
      asOf: analysis.asOf,
    });

    expect(parseResult.success).toBe(true);
    expect(analysis.observations.length).toBeGreaterThan(0);
    expect(analysis.risks.length).toBeGreaterThan(0);
    expect(analysis.uncertainties?.length).toBeGreaterThan(0);
    expect(analysis.sources.length).toBeGreaterThan(0);
    expect(analysis.indicators.sma20).toBeDefined();
    expect(analysis.indicators.rsi14).toBeDefined();
  });

  it('should never expose API tokens in research output or errors', async () => {
    process.env.ANTHROPIC_API_KEY = 'secret-anthropic-key-999';

    // Mock Anthropic API failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const analysis = await generateStockResearch({
      instrument: mockInstrument,
      quote: mockQuote,
      candles: mockCandles,
    });

    const serialized = JSON.stringify(analysis);
    expect(serialized).not.toContain('secret-anthropic-key-999');
    expect(analysis.summary).toBeDefined();
  });

  it('should ground observations in calculated indicator metrics', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const analysis = await generateStockResearch({
      instrument: mockInstrument,
      quote: mockQuote,
      candles: mockCandles,
    });

    // Verify presence of indicator-grounded observations
    const observationsText = analysis.observations.join(' ');
    expect(observationsText).toMatch(/20-day Simple Moving Average|SMA|RSI/i);
    expect(analysis.sources.some((s) => s.url.includes('nseindia.com') || s.url.includes('bseindia.com'))).toBe(true);
  });
});
