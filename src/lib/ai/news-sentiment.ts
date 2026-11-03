import { NewsItem, SentimentType } from '@/types/market';

const POSITIVE_PATTERNS = [
  /\b(surge|surges|surged|jump|jumps|jumped|rally|rallies|gain|gains|gained)\b/i,
  /\b(profit rises|profit climbs|profit surges|record profit|strong earnings|beats estimates|revenue growth)\b/i,
  /\b(expansion|expands|expansionary|partnership|alliances?)\b/i,
  /\b(wins?|won|secures?|secured|bags?|bagged)\b/i,
  /\b(contract|multi-million|deal win|order win)\b/i,
  /\b(upgrade|upgraded|target raised|buy rating|outperform|bullish)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(plunge|plunges|plunged|slump|slumps|slumped|drop|drops|dropped|crash|crashes)\b/i,
  /\b(loss widens|profit drops|profit falls|misses estimates|revenue decline|deficit)\b/i,
  /\b(penalty|probe|fraud|sebi investigation|fine imposed|scrutiny|subpoena|scam)\b/i,
  /\b(downgrade|downgraded|target cut|sell rating|underperform|bearish)\b/i,
];

/**
 * Classifies headline and summary text into a sentiment rating using deterministic pattern matching.
 */
export function classifyTextSentiment(text: string): {
  sentiment: SentimentType;
  explanation: string;
} {
  const isPositive = POSITIVE_PATTERNS.some((p) => p.test(text));
  const isNegative = NEGATIVE_PATTERNS.some((p) => p.test(text));

  if (isPositive && isNegative) {
    return {
      sentiment: 'unclear',
      explanation: 'Article contains mixed sentiment signals (both positive expansion and negative risk factors).',
    };
  }

  if (isPositive) {
    return {
      sentiment: 'positive',
      explanation: 'Grounded in reported financial growth, contract wins, or positive performance metrics.',
    };
  }

  if (isNegative) {
    return {
      sentiment: 'negative',
      explanation: 'Grounded in reported earnings declines, market drawdowns, or regulatory scrutiny.',
    };
  }

  return {
    sentiment: 'neutral',
    explanation: 'Factual disclosure or balanced market commentary without directional bias.',
  };
}

/**
 * Enriches a list of NewsItems with attributed sentiment classifications.
 */
export function enrichNewsWithSentiment(items: NewsItem[]): NewsItem[] {
  return items.map((item) => {
    const textToAnalyze = `${item.title} ${item.summary || ''}`;
    const result = classifyTextSentiment(textToAnalyze);

    return {
      ...item,
      sentiment: result.sentiment,
      explanation: item.explanation || result.explanation,
    };
  });
}
