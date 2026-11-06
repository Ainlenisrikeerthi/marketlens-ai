"""
News sentiment classification and enrichment.
Port of news-sentiment.ts.
"""

import re

POSITIVE_PATTERNS = [
    re.compile(r'\b(surge|surges|surged|jump|jumps|jumped|rally|rallies|gain|gains|gained)\b', re.IGNORECASE),
    re.compile(r'\b(profit rises|profit climbs|profit surges|record profit|strong earnings|beats estimates|revenue growth)\b', re.IGNORECASE),
    re.compile(r'\b(expansion|expands|expansionary|partnership|alliances?)\b', re.IGNORECASE),
    re.compile(r'\b(wins?|won|secures?|secured|bags?|bagged)\b', re.IGNORECASE),
    re.compile(r'\b(contract|multi-million|deal win|order win)\b', re.IGNORECASE),
    re.compile(r'\b(upgrade|upgraded|target raised|buy rating|outperform|bullish)\b', re.IGNORECASE),
]

NEGATIVE_PATTERNS = [
    re.compile(r'\b(plunge|plunges|plunged|slump|slumps|slumped|drop|drops|dropped|crash|crashes)\b', re.IGNORECASE),
    re.compile(r'\b(loss widens|profit drops|profit falls|misses estimates|revenue decline|deficit)\b', re.IGNORECASE),
    re.compile(r'\b(penalty|probe|fraud|sebi investigation|fine imposed|scrutiny|subpoena|scam)\b', re.IGNORECASE),
    re.compile(r'\b(downgrade|downgraded|target cut|sell rating|underperform|bearish)\b', re.IGNORECASE),
]


def classify_text_sentiment(text):
    """
    Classifies headline and summary text into a sentiment rating using deterministic pattern matching.
    """
    is_positive = any(p.search(text) for p in POSITIVE_PATTERNS)
    is_negative = any(p.search(text) for p in NEGATIVE_PATTERNS)

    if is_positive and is_negative:
        return {
            'sentiment': 'unclear',
            'explanation': 'Article contains mixed sentiment signals (both positive expansion and negative risk factors).',
        }

    if is_positive:
        return {
            'sentiment': 'positive',
            'explanation': 'Grounded in reported financial growth, contract wins, or positive performance metrics.',
        }

    if is_negative:
        return {
            'sentiment': 'negative',
            'explanation': 'Grounded in reported earnings declines, market drawdowns, or regulatory scrutiny.',
        }

    return {
        'sentiment': 'neutral',
        'explanation': 'Factual disclosure or balanced market commentary without directional bias.',
    }


def enrich_news_with_sentiment(items):
    """
    Enriches a list of NewsItems with attributed sentiment classifications.
    """
    enriched = []
    for item in items:
        item_copy = dict(item)
        text_to_analyze = f"{item.get('title', '')} {item.get('summary', '')}"
        res = classify_text_sentiment(text_to_analyze)
        item_copy['sentiment'] = res['sentiment']
        item_copy['explanation'] = item.get('explanation') or res['explanation']
        enriched.append(item_copy)
    return enriched

