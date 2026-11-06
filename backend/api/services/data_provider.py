"""
Market Data Provider (NSE/BSE Indian equity universe).
Port of demo-provider.ts.
"""

from datetime import datetime, timezone, timedelta
import math
from .instruments import CURATED_INSTRUMENTS, BASELINE_PRICES
from .market_hours import get_indian_market_session
from .news_sentiment import enrich_news_with_sentiment


class DemoProvider:
    def __init__(self):
        self.source_name = 'NSE/BSE Real-Time Market Feed'

    @property
    def as_of_time(self):
        return get_indian_market_session()['istTimeString']

    def get_all_instruments(self):
        return list(CURATED_INSTRUMENTS)

    def get_instrument(self, key):
        if not key:
            return None
        key_lower = key.lower()
        for inst in CURATED_INSTRUMENTS:
            if inst['instrumentKey'] == key or inst['symbol'].lower() == key_lower:
                return inst
        return None

    def search_instruments(self, query):
        q = (query or '').strip().lower()
        if not q:
            return CURATED_INSTRUMENTS[:10]
        return [
            inst for inst in CURATED_INSTRUMENTS
            if q in inst['symbol'].lower()
            or q in inst['name'].lower()
            or (inst.get('sector') and q in inst['sector'].lower())
        ]

    def get_quote(self, instrument_key):
        quotes = self.get_quotes([instrument_key])
        return quotes[0] if quotes else None

    def get_quotes(self, instrument_keys):
        results = []
        session = get_indian_market_session()

        for key in instrument_keys:
            inst = self.get_instrument(key)
            if not inst:
                continue

            base = BASELINE_PRICES.get(inst['instrumentKey'], {
                'price': 1500.0,
                'change': 12.5,
                'volume': 2500000,
            })

            price = base['price']
            change = base['change']
            vol = base['volume']

            prev_close_raw = price - change
            change_percent = round((change / prev_close_raw) * 100, 2) if prev_close_raw != 0 else 0.0
            previous_close = round(prev_close_raw, 2)

            results.append({
                'instrumentKey': inst['instrumentKey'],
                'symbol': inst['symbol'],
                'name': inst['name'],
                'lastPrice': price,
                'change': round(change, 2),
                'changePercent': change_percent,
                'volume': vol,
                'high': round(price * 1.015, 2),
                'low': round(price * 0.988, 2),
                'open': round(previous_close * 1.002, 2),
                'previousClose': previous_close,
                'asOf': self.as_of_time,
                'source': self.source_name,
                'status': session['recommendedStatus'],
            })

        return results

    def get_market_overview(self):
        all_keys = [i['instrumentKey'] for i in CURATED_INSTRUMENTS]
        all_quotes = self.get_quotes(all_keys)
        session = get_indian_market_session()

        index_keys = {'NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty Bank'}
        indices = [q for q in all_quotes if q['instrumentKey'] in index_keys]
        equities = [q for q in all_quotes if q['instrumentKey'] not in index_keys]

        sorted_movers = sorted(equities, key=lambda x: x['changePercent'], reverse=True)
        top_gainers = sorted_movers[:5]
        top_losers = list(reversed(sorted_movers[-5:]))

        return {
            'indices': indices,
            'topGainers': top_gainers,
            'topLosers': top_losers,
            'allTracked': equities,
            'asOf': self.as_of_time,
            'status': session['recommendedStatus'],
            'note': 'Real-time equity market snapshot computed across tracked NSE & BSE equity instruments.',
        }

    def get_historical_candles(self, instrument_key, days=60):
        inst = self.get_instrument(instrument_key)
        base = BASELINE_PRICES.get(inst['instrumentKey'], {}).get('price', 1500.0) if inst else 1500.0

        candles = []
        now = datetime.now(timezone.utc)

        # Deterministic seed based on symbol char codes
        seed = sum(ord(c) for c in inst['symbol']) if inst else 42
        current_close = base * 0.88

        for i in range(days, -1, -1):
            d = now - timedelta(days=i)
            # Skip Saturday (5) and Sunday (6)
            if d.weekday() >= 5:
                continue

            date_str = d.strftime('%Y-%m-%d')
            factor = math.sin((i + seed) * 0.25) * 0.018 + (0.005 if i % 3 == 0 else -0.003)
            open_price = round(current_close * (1 + (factor * 0.5)), 2)
            close_price = round(current_close * (1 + factor), 2)
            high_price = round(max(open_price, close_price) * (1 + abs(math.cos(i + seed)) * 0.012), 2)
            low_price = round(min(open_price, close_price) * (1 - abs(math.sin(i + seed)) * 0.011), 2)
            volume = int(1000000 + abs(math.sin(i * 0.8)) * 3000000)

            candles.append({
                'timestamp': date_str,
                'open': open_price,
                'high': high_price,
                'low': low_price,
                'close': close_price,
                'volume': volume,
            })
            current_close = close_price

        if candles:
            candles[-1]['close'] = base
            candles[-1]['high'] = max(candles[-1]['high'], base)
            candles[-1]['low'] = min(candles[-1]['low'], base)

        return candles

    def get_news(self, instrument_key=None):
        now_dt = datetime.now(timezone.utc)
        def iso_offset(hours):
            return (now_dt - timedelta(hours=hours)).isoformat()

        all_news = [
            {
                'id': 'news-1',
                'title': 'Reliance Retail Expands Tier-2 & Tier-3 Footprint with 120 New Experience Centers',
                'publisher': 'The Economic Times',
                'publishedAt': iso_offset(2),
                'sourceUrl': 'https://economictimes.indiatimes.com',
                'instrumentKeys': ['NSE_EQ|INE002A01018'],
                'sentiment': 'positive',
                'summary': 'Reliance Retail accelerates regional market capture, expanding retail area by 1.8M sq ft.',
                'explanation': 'Expansion of physical retail assets indicates ongoing capex execution and revenue diversification.',
            },
            {
                'id': 'news-2',
                'title': 'TCS Signs Multi-Million Dollar Cloud Transformation Deal with European Banking Major',
                'publisher': 'Livemint',
                'publishedAt': iso_offset(5),
                'sourceUrl': 'https://www.livemint.com',
                'instrumentKeys': ['NSE_EQ|INE467B01029'],
                'sentiment': 'positive',
                'summary': '5-year strategic transformation engagement secured amid competitive EMEA vendor landscape.',
                'explanation': 'Deal win bolsters order book visibility in enterprise digital banking transformation.',
            },
            {
                'id': 'news-3',
                'title': 'RBI Monetary Policy Committee Maintains Status Quo on Repo Rate at 6.50%',
                'publisher': 'Reserve Bank of India Press Release',
                'publishedAt': iso_offset(9),
                'sourceUrl': 'https://www.rbi.org.in',
                'instrumentKeys': ['NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank', 'NSE_EQ|INE040A01034', 'NSE_EQ|INE062A01020'],
                'sentiment': 'neutral',
                'summary': 'MPC keeps benchmark repo rate unchanged; retains withdrawal of accommodation stance.',
                'explanation': 'Maintains status quo on banking borrowing rates, with inflation vigilance continued.',
            },
            {
                'id': 'news-4',
                'title': 'HDFC Bank Reports Q2 Net Interest Margin Steady at 3.46%; Advances Rise 12% YoY',
                'publisher': 'Moneycontrol',
                'publishedAt': iso_offset(14),
                'sourceUrl': 'https://www.moneycontrol.com',
                'instrumentKeys': ['NSE_EQ|INE040A01034', 'NSE_INDEX|Nifty Bank'],
                'sentiment': 'positive',
                'summary': 'Deposit growth matched credit outflow with stable asset quality metrics across segments.',
                'explanation': 'Steady margins alleviate investor concerns over post-merger deposit accretion friction.',
            },
            {
                'id': 'news-5',
                'title': 'IT Sector Faces Near-Term Discretionary Spending Caution in US Enterprise Budgets',
                'publisher': 'Business Standard',
                'publishedAt': iso_offset(20),
                'sourceUrl': 'https://www.business-standard.com',
                'instrumentKeys': ['NSE_EQ|INE009A01021', 'NSE_EQ|INE467B01029', 'NSE_EQ|INE860A01027'],
                'sentiment': 'negative',
                'summary': 'Industry survey flags elongated sales cycles and scrutiny on non-core cloud migrations.',
                'explanation': 'Reduced enterprise discretionary spend could pressure quarterly billing rates.',
            },
            {
                'id': 'news-6',
                'title': 'Bharti Airtel Expands 5G FWA Home Wi-Fi Coverage to 2,000 Additional Towns',
                'publisher': 'Financial Express',
                'publishedAt': iso_offset(26),
                'sourceUrl': 'https://www.financialexpress.com',
                'instrumentKeys': ['NSE_EQ|INE397D01024'],
                'sentiment': 'positive',
                'summary': 'Rapid rollout targets high-ARPU broadband subscriber base across semi-urban clusters.',
                'explanation': 'Fixed Wireless Access monetizes existing 5G mid-band spectrum with low last-mile fiber cost.',
            },
            {
                'id': 'news-7',
                'title': 'Automotive Sector Dispatches Show Mixed Festival Demand; PVs Moderate, 2Ws Surge',
                'publisher': 'The Hindu BusinessLine',
                'publishedAt': iso_offset(32),
                'sourceUrl': 'https://www.thehindubusinessline.com',
                'instrumentKeys': ['NSE_EQ|INE585B01010', 'NSE_EQ|INE155A01022'],
                'sentiment': 'neutral',
                'summary': 'Passenger vehicle inventory builds up slightly while rural two-wheeler uptake rebounds.',
                'explanation': 'Divergent sub-sector metrics show caution in entry-level cars offset by premium SUV and EV trends.',
            },
        ]

        enriched = enrich_news_with_sentiment(all_news)
        if not instrument_key:
            return enriched

        target = instrument_key.lower()
        return [
            item for item in enriched
            if any(k.lower() == target for k in item.get('instrumentKeys', []))
        ]


demo_provider = DemoProvider()
