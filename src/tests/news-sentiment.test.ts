import { describe, it, expect } from 'vitest';
import { classifyTextSentiment, enrichNewsWithSentiment } from '../lib/ai/news-sentiment';
import { NewsItem } from '../types/market';

describe('News Sentiment Classification Specification (Phase P3)', () => {
  it('should classify growth and order win news as positive', () => {
    const res = classifyTextSentiment('Reliance Retail secures massive expansion order and surges to record profit');
    expect(res.sentiment).toBe('positive');
    expect(res.explanation).toContain('financial growth');
  });

  it('should classify regulatory probes and loss news as negative', () => {
    const res = classifyTextSentiment('Regulator imposes penalty on brokerage firm as quarterly loss widens');
    expect(res.sentiment).toBe('negative');
    expect(res.explanation).toContain('drawdowns');
  });

  it('should classify conflicting positive and negative news as unclear', () => {
    const res = classifyTextSentiment('Revenue surges by 20% but severe penalty probe causes stock to plunge');
    expect(res.sentiment).toBe('unclear');
    expect(res.explanation).toContain('mixed');
  });

  it('should classify neutral administrative announcements as neutral', () => {
    const res = classifyTextSentiment('Board of Directors to meet on November 15 to consider quarterly financial results');
    expect(res.sentiment).toBe('neutral');
  });

  it('should enrich array of NewsItems with valid sentiment and explanations', () => {
    const items: NewsItem[] = [
      {
        id: 'test-1',
        title: 'TCS Wins Multi-Million Dollar Digital Banking Contract',
        publisher: 'Financial Express',
        publishedAt: '2026-10-31T10:00:00+05:30',
        sourceUrl: 'https://financialexpress.com/1',
        instrumentKeys: ['NSE_EQ|INE467B01029'],
        sentiment: 'neutral', // Initial unclassified state
      },
      {
        id: 'test-2',
        title: 'Automaker Sales Drop 15% Amid Supply Constraints',
        publisher: 'Livemint',
        publishedAt: '2026-10-31T11:00:00+05:30',
        sourceUrl: 'https://livemint.com/2',
        instrumentKeys: ['NSE_EQ|INE585B01010'],
        sentiment: 'neutral',
      },
    ];

    const enriched = enrichNewsWithSentiment(items);
    expect(enriched[0].sentiment).toBe('positive');
    expect(enriched[0].explanation).toBeDefined();

    expect(enriched[1].sentiment).toBe('negative');
    expect(enriched[1].explanation).toBeDefined();
  });
});
