import { z } from 'zod';
import { Candle, Instrument, Quote, StockAnalysis, TechnicalIndicators } from '@/types/market';
import { calculateIndicators } from '../indicators';
import { serverCache } from '../data-provider/cache';

export const GroundedResearchSchema = z.object({
  summary: z.string().min(1),
  observations: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  uncertainties: z.array(z.string()).min(1),
  sources: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
    })
  ),
  asOf: z.string(),
});

export type GroundedResearchResult = z.infer<typeof GroundedResearchSchema>;

export interface GenerateResearchInput {
  instrument: Instrument;
  quote?: Quote | null;
  candles: Candle[];
  newsHeadlines?: string[];
}

/**
 * Builds deterministic analytical observations based strictly on verified indicator values.
 */
export function buildDeterministicResearch(
  instrument: Instrument,
  quote: Quote | null | undefined,
  candles: Candle[],
  indicators: TechnicalIndicators,
  asOf: string,
  isAiFallback: boolean = false
): GroundedResearchResult {
  const lastPrice = quote?.lastPrice || (candles.length > 0 ? candles[candles.length - 1].close : 100);
  const observations: string[] = [];

  // Price vs SMA20
  if (indicators.sma20 !== undefined) {
    if (lastPrice >= indicators.sma20) {
      observations.push(
        `Last traded price (₹${lastPrice.toLocaleString('en-IN')}) trades above the 20-day Simple Moving Average (₹${indicators.sma20.toLocaleString('en-IN')}), indicating positive short-term price posture.`
      );
    } else {
      observations.push(
        `Last traded price (₹${lastPrice.toLocaleString('en-IN')}) trades below the 20-day Simple Moving Average (₹${indicators.sma20.toLocaleString('en-IN')}), indicating short-term weakness relative to the 20-day mean.`
      );
    }
  }

  // SMA20 vs SMA50 Trend Alignment
  if (indicators.sma20 !== undefined && indicators.sma50 !== undefined) {
    if (indicators.sma20 > indicators.sma50) {
      observations.push(
        `The 20-day SMA (₹${indicators.sma20.toLocaleString('en-IN')}) is positioned above the 50-day SMA (₹${indicators.sma50.toLocaleString('en-IN')}), reflecting an intact medium-term upward trend alignment.`
      );
    } else {
      observations.push(
        `The 20-day SMA (₹${indicators.sma20.toLocaleString('en-IN')}) is positioned below the 50-day SMA (₹${indicators.sma50.toLocaleString('en-IN')}), reflecting prevailing downward or consolidation pressure.`
      );
    }
  }

  // RSI Momentum
  if (indicators.rsi14 !== undefined) {
    if (indicators.rsi14 > 70) {
      observations.push(
        `14-day RSI is at ${indicators.rsi14}, exceeding the standard overbought threshold of 70. Momentum is stretched.`
      );
    } else if (indicators.rsi14 < 30) {
      observations.push(
        `14-day RSI is at ${indicators.rsi14}, below the standard oversold threshold of 30. Mean-reversion conditions may emerge.`
      );
    } else {
      observations.push(
        `14-day RSI is neutral at ${indicators.rsi14} (within standard 30–70 boundary bands).`
      );
    }
  }

  // EMA20 vs Price
  if (indicators.ema20 !== undefined) {
    observations.push(
      `20-day Exponential Moving Average (EMA) stands at ₹${indicators.ema20.toLocaleString('en-IN')}, providing a volume-weighted short-term baseline.`
    );
  }

  const engineNotice = isAiFallback
    ? ' [Rule-Based Analytical Engine — Anthropic API Key not configured or unavailable]'
    : '';

  const summary = `Deterministic technical synthesis for ${instrument.name} (${instrument.symbol}) based on ${candles.length} verified daily OHLCV bars as of ${asOf}.${engineNotice}`;

  const risks: string[] = [
    'Technical indicators represent lagging historical computations and cannot predict abrupt trend reversals.',
    'Macroeconomic shifts, RBI rate decisions, and global equity cues can override technical formations.',
    'Execution slippage, transaction costs (STT, GST, exchange turnover charges), and circuit bands impact realized outcomes.',
  ];

  const uncertainties: string[] = [
    'Upcoming quarterly earnings disclosures and corporate announcements create binary gap-risk potential.',
    'Foreign Institutional Investor (FII) and Domestic Institutional Investor (DII) net flow imbalances create non-technical intraday volatility.',
  ];

  const sources = [
    { label: `${instrument.exchange} Official Exchange Feed`, url: instrument.exchange === 'BSE' ? 'https://www.bseindia.com' : 'https://www.nseindia.com' },
    { label: 'MarketLens Verified OHLCV Time-Series', url: 'https://marketlens.ai/data-attribution' },
  ];

  return {
    summary,
    observations,
    risks,
    uncertainties,
    sources,
    asOf,
  };
}

/**
 * Generates grounded stock research.
 * If ANTHROPIC_API_KEY is configured, calls Claude with strict grounding prompt and validates structured JSON.
 * Otherwise, seamlessly falls back to the deterministic analytical engine.
 */
export async function generateStockResearch(
  input: GenerateResearchInput
): Promise<StockAnalysis> {
  const { instrument, quote, candles, newsHeadlines } = input;
  const asOf = quote?.asOf || new Date().toISOString();
  const cacheKey = `stock_research_${instrument.instrumentKey}_${asOf.split('T')[0]}`;

  const cached = serverCache.get<StockAnalysis>(cacheKey);
  if (cached) return cached;

  const indicators = calculateIndicators(candles);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let research: GroundedResearchResult;
  let isAiPowered = false;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const promptData = {
        instrument: {
          symbol: instrument.symbol,
          name: instrument.name,
          exchange: instrument.exchange,
          sector: instrument.sector,
        },
        marketData: {
          lastPrice: quote?.lastPrice,
          change: quote?.change,
          changePercent: quote?.changePercent,
          volume: quote?.volume,
          asOf,
          status: quote?.status || 'LIVE',
        },
        indicators,
        candleCount: candles.length,
        newsHeadlines: newsHeadlines || [],
      };

      const systemPrompt = `You are a professional, compliance-grade financial research assistant for Indian stock markets.
Follow these mandatory SOW Section 9 rules:
1. State strictly what the supplied verified data supports, what it does NOT support, and when it was observed.
2. Never manufacture numbers, prices, articles, citations, forward price targets, or certainty.
3. If data is limited or neutral, say so explicitly.
4. Do NOT output personalized position sizing or autonomous trade instructions.
5. Return ONLY a single valid JSON object strictly matching this schema:
{
  "summary": "Concise factual summary (1-2 sentences)",
  "observations": ["Observation 1 grounded strictly in numbers", "Observation 2"],
  "risks": ["Risk 1", "Risk 2"],
  "uncertainties": ["Uncertainty 1", "Uncertainty 2"],
  "sources": [{"label": "Source Name", "url": "https://source.url"}],
  "asOf": "${asOf}"
}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Analyze this verified stock data strictly adhering to compliance rules:\n\n${JSON.stringify(promptData, null, 2)}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawText = json.content?.[0]?.text || '';
        // Extract JSON substring if wrapped in markdown fences
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = GroundedResearchSchema.safeParse(parsed);
          if (validated.success) {
            research = validated.data;
            isAiPowered = true;
          } else {
            research = buildDeterministicResearch(instrument, quote, candles, indicators, asOf, true);
          }
        } else {
          research = buildDeterministicResearch(instrument, quote, candles, indicators, asOf, true);
        }
      } else {
        // Safe fallback on upstream API rejection/error without exposing token
        research = buildDeterministicResearch(instrument, quote, candles, indicators, asOf, true);
      }
    } catch {
      // Safe fallback on network failure
      research = buildDeterministicResearch(instrument, quote, candles, indicators, asOf, true);
    }
  } else {
    // Zero-config deterministic fallback
    research = buildDeterministicResearch(instrument, quote, candles, indicators, asOf, false);
  }

  const analysis: StockAnalysis = {
    instrumentKey: instrument.instrumentKey,
    symbol: instrument.symbol,
    asOf: research.asOf,
    indicators,
    summary: research.summary,
    observations: research.observations,
    risks: research.risks,
    uncertainties: research.uncertainties,
    sources: research.sources,
    dataQualityWarnings: isAiPowered
      ? []
      : ['AI API key not configured or offline. Research generated via deterministic mathematical engine.'],
    status: quote?.status || 'LIVE',
  };

  // Cache research for 5 minutes
  serverCache.set(cacheKey, analysis, 300);

  return analysis;
}
