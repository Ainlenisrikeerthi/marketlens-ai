"""
Deterministic and AI Stock Research generation.
Port of stock-research.ts.
"""

import os
import json
import requests
from datetime import datetime, timezone
from .indicators import calculate_indicators


def build_deterministic_research(instrument, quote, candles, indicators, as_of, is_ai_fallback=False):
    last_price = quote['lastPrice'] if (quote and 'lastPrice' in quote) else (candles[-1]['close'] if candles else 100)
    observations = []

    # Price vs SMA20
    sma20 = indicators.get('sma20')
    if sma20 is not None:
        if last_price >= sma20:
            observations.append(
                f"Last traded price (₹{last_price:,.2f}) trades above the 20-day Simple Moving Average (₹{sma20:,.2f}), indicating positive short-term price posture."
            )
        else:
            observations.append(
                f"Last traded price (₹{last_price:,.2f}) trades below the 20-day Simple Moving Average (₹{sma20:,.2f}), indicating short-term weakness relative to the 20-day mean."
            )

    # SMA20 vs SMA50
    sma50 = indicators.get('sma50')
    if sma20 is not None and sma50 is not None:
        if sma20 > sma50:
            observations.append(
                f"The 20-day SMA (₹{sma20:,.2f}) is positioned above the 50-day SMA (₹{sma50:,.2f}), reflecting an intact medium-term upward trend alignment."
            )
        else:
            observations.append(
                f"The 20-day SMA (₹{sma20:,.2f}) is positioned below the 50-day SMA (₹{sma50:,.2f}), reflecting prevailing downward or consolidation pressure."
            )

    # RSI Momentum
    rsi14 = indicators.get('rsi14')
    if rsi14 is not None:
        if rsi14 > 70:
            observations.append(
                f"14-day RSI is at {rsi14}, exceeding the standard overbought threshold of 70. Momentum is stretched."
            )
        elif rsi14 < 30:
            observations.append(
                f"14-day RSI is at {rsi14}, below the standard oversold threshold of 30. Mean-reversion conditions may emerge."
            )
        else:
            observations.append(
                f"14-day RSI is neutral at {rsi14} (within standard 30–70 boundary bands)."
            )

    # EMA20
    ema20 = indicators.get('ema20')
    if ema20 is not None:
        observations.append(
            f"20-day Exponential Moving Average (EMA) stands at ₹{ema20:,.2f}, providing a volume-weighted short-term baseline."
        )

    engine_notice = ' [Rule-Based Analytical Engine — Anthropic API Key not configured or unavailable]' if is_ai_fallback else ''
    summary = f"Deterministic technical synthesis for {instrument['name']} ({instrument['symbol']}) based on {len(candles)} verified daily OHLCV bars as of {as_of}.{engine_notice}"

    risks = [
        'Technical indicators represent lagging historical computations and cannot predict abrupt trend reversals.',
        'Macroeconomic shifts, RBI rate decisions, and global equity cues can override technical formations.',
        'Execution slippage, transaction costs (STT, GST, exchange turnover charges), and circuit bands impact realized outcomes.',
    ]

    uncertainties = [
        'Upcoming quarterly earnings disclosures and corporate announcements create binary gap-risk potential.',
        'Foreign Institutional Investor (FII) and Domestic Institutional Investor (DII) net flow imbalances create non-technical intraday volatility.',
    ]

    sources = [
        {
            'label': f"{instrument.get('exchange', 'NSE')} Official Exchange Feed",
            'url': 'https://www.bseindia.com' if instrument.get('exchange') == 'BSE' else 'https://www.nseindia.com',
        },
        {'label': 'MarketLens Verified OHLCV Time-Series', 'url': 'https://marketlens.ai/data-attribution'},
    ]

    return {
        'summary': summary,
        'observations': observations,
        'risks': risks,
        'uncertainties': uncertainties,
        'sources': sources,
        'asOf': as_of,
    }


def generate_stock_research(instrument, quote, candles, news_headlines=None):
    as_of = quote.get('asOf') if quote else datetime.now(timezone.utc).isoformat()
    indicators = calculate_indicators(candles)
    api_key = os.environ.get('ANTHROPIC_API_KEY', '').strip()

    research = None
    is_ai_powered = False

    if api_key:
        try:
            prompt_data = {
                'instrument': {
                    'symbol': instrument['symbol'],
                    'name': instrument['name'],
                    'exchange': instrument.get('exchange'),
                    'sector': instrument.get('sector'),
                },
                'marketData': {
                    'lastPrice': quote.get('lastPrice') if quote else None,
                    'change': quote.get('change') if quote else None,
                    'changePercent': quote.get('changePercent') if quote else None,
                    'volume': quote.get('volume') if quote else None,
                    'asOf': as_of,
                    'status': quote.get('status', 'LIVE') if quote else 'LIVE',
                },
                'indicators': indicators,
                'candleCount': len(candles),
                'newsHeadlines': news_headlines or [],
            }

            system_prompt = f"""You are a professional, compliance-grade financial research assistant for Indian stock markets.
Follow these mandatory rules:
1. State strictly what the supplied verified data supports, what it does NOT support, and when it was observed.
2. Never manufacture numbers, prices, articles, citations, forward price targets, or certainty.
3. If data is limited or neutral, say so explicitly.
4. Do NOT output personalized position sizing or autonomous trade instructions.
5. Return ONLY a single valid JSON object strictly matching this schema:
{{
  "summary": "Concise factual summary (1-2 sentences)",
  "observations": ["Observation 1 grounded strictly in numbers", "Observation 2"],
  "risks": ["Risk 1", "Risk 2"],
  "uncertainties": ["Uncertainty 1", "Uncertainty 2"],
  "sources": [{{"label": "Source Name", "url": "https://source.url"}}],
  "asOf": "{as_of}"
}}"""

            resp = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                json={
                    'model': 'claude-3-5-sonnet-20241022',
                    'max_tokens': 1024,
                    'system': system_prompt,
                    'messages': [
                        {
                            'role': 'user',
                            'content': f"Analyze this verified stock data strictly adhering to compliance rules:\n\n{json.dumps(prompt_data, indent=2)}",
                        }
                    ],
                },
                timeout=10,
            )

            if resp.status_code == 200:
                resp_json = resp.json()
                raw_text = resp_json.get('content', [{}])[0].get('text', '')
                import re
                json_match = re.search(r'\{[\s\S]*\}', raw_text)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    if all(k in parsed for k in ('summary', 'observations', 'risks', 'uncertainties', 'sources', 'asOf')):
                        research = parsed
                        is_ai_powered = True
        except Exception:
            pass

    if not research:
        research = build_deterministic_research(instrument, quote, candles, indicators, as_of, is_ai_fallback=bool(api_key))

    return {
        'instrumentKey': instrument['instrumentKey'],
        'symbol': instrument['symbol'],
        'asOf': research['asOf'],
        'indicators': indicators,
        'summary': research['summary'],
        'observations': research['observations'],
        'risks': research['risks'],
        'uncertainties': research['uncertainties'],
        'sources': research['sources'],
        'dataQualityWarnings': [] if is_ai_powered else ['AI API key not configured or offline. Research generated via deterministic mathematical engine.'],
        'status': quote.get('status', 'LIVE') if quote else 'LIVE',
    }
