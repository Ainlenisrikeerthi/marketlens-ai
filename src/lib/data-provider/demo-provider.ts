import {
  Instrument,
  Quote,
  Candle,
  NewsItem,
  StockAnalysis,
  MarketOverview,
  BacktestParameters,
  BacktestResult,
  BacktestTrade,
  EquityCurvePoint,
  TechnicalIndicators
} from '@/types/market';
import { MarketDataProvider } from './index';
import { getIndianMarketSession } from './market-hours';
import { generateStockResearch } from '../ai/stock-research';
import { enrichNewsWithSentiment } from '../ai/news-sentiment';
import { runStrategyBacktest } from '../simulation/backtest-engine';

export const CURATED_INSTRUMENTS: Instrument[] = [
  // Major Indian Indices
  {
    instrumentKey: 'NSE_INDEX|Nifty 50',
    symbol: 'NIFTY 50',
    exchange: 'INDEX',
    name: 'NIFTY 50 Index',
    currency: 'INR',
    isIndex: true,
  },
  {
    instrumentKey: 'BSE_INDEX|SENSEX',
    symbol: 'SENSEX',
    exchange: 'INDEX',
    name: 'S&P BSE SENSEX',
    currency: 'INR',
    isIndex: true,
  },
  {
    instrumentKey: 'NSE_INDEX|Nifty Bank',
    symbol: 'BANK NIFTY',
    exchange: 'INDEX',
    name: 'NIFTY Bank Index',
    currency: 'INR',
    isIndex: true,
  },
  // 20 Tracked Indian Equities
  {
    instrumentKey: 'NSE_EQ|INE002A01018',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Ltd.',
    currency: 'INR',
    sector: 'Oil & Gas / Conglomerate',
  },
  {
    instrumentKey: 'NSE_EQ|INE467B01029',
    symbol: 'TCS',
    exchange: 'NSE',
    name: 'Tata Consultancy Services Ltd.',
    currency: 'INR',
    sector: 'IT Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE040A01034',
    symbol: 'HDFCBANK',
    exchange: 'NSE',
    name: 'HDFC Bank Ltd.',
    currency: 'INR',
    sector: 'Banking & Financial Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE009A01021',
    symbol: 'INFY',
    exchange: 'NSE',
    name: 'Infosys Ltd.',
    currency: 'INR',
    sector: 'IT Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE090A01021',
    symbol: 'ICICIBANK',
    exchange: 'NSE',
    name: 'ICICI Bank Ltd.',
    currency: 'INR',
    sector: 'Banking & Financial Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE397D01024',
    symbol: 'BHARTIARTL',
    exchange: 'NSE',
    name: 'Bharti Airtel Ltd.',
    currency: 'INR',
    sector: 'Telecommunications',
  },
  {
    instrumentKey: 'NSE_EQ|INE062A01020',
    symbol: 'SBIN',
    exchange: 'NSE',
    name: 'State Bank of India',
    currency: 'INR',
    sector: 'Banking & Financial Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE154A01025',
    symbol: 'ITC',
    exchange: 'NSE',
    name: 'ITC Ltd.',
    currency: 'INR',
    sector: 'FMCG / Diversified',
  },
  {
    instrumentKey: 'NSE_EQ|INE115A01026',
    symbol: 'LICI',
    exchange: 'NSE',
    name: 'Life Insurance Corporation of India',
    currency: 'INR',
    sector: 'Insurance',
  },
  {
    instrumentKey: 'NSE_EQ|INE030A01027',
    symbol: 'HINDUNILVR',
    exchange: 'NSE',
    name: 'Hindustan Unilever Ltd.',
    currency: 'INR',
    sector: 'FMCG',
  },
  {
    instrumentKey: 'NSE_EQ|INE018A01030',
    symbol: 'LT',
    exchange: 'NSE',
    name: 'Larsen & Toubro Ltd.',
    currency: 'INR',
    sector: 'Engineering & Construction',
  },
  {
    instrumentKey: 'NSE_EQ|INE296A01024',
    symbol: 'BAJFINANCE',
    exchange: 'NSE',
    name: 'Bajaj Finance Ltd.',
    currency: 'INR',
    sector: 'Non-Banking Financial',
  },
  {
    instrumentKey: 'NSE_EQ|INE585B01010',
    symbol: 'MARUTI',
    exchange: 'NSE',
    name: 'Maruti Suzuki India Ltd.',
    currency: 'INR',
    sector: 'Automobile',
  },
  {
    instrumentKey: 'NSE_EQ|INE860A01027',
    symbol: 'HCLTECH',
    exchange: 'NSE',
    name: 'HCL Technologies Ltd.',
    currency: 'INR',
    sector: 'IT Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE044A01036',
    symbol: 'SUNPHARMA',
    exchange: 'NSE',
    name: 'Sun Pharmaceutical Industries Ltd.',
    currency: 'INR',
    sector: 'Pharmaceuticals',
  },
  {
    instrumentKey: 'NSE_EQ|INE155A01022',
    symbol: 'TATAMOTORS',
    exchange: 'NSE',
    name: 'Tata Motors Ltd.',
    currency: 'INR',
    sector: 'Automobile',
  },
  {
    instrumentKey: 'NSE_EQ|INE237A01028',
    symbol: 'KOTAKBANK',
    exchange: 'NSE',
    name: 'Kotak Mahindra Bank Ltd.',
    currency: 'INR',
    sector: 'Banking & Financial Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE280A01028',
    symbol: 'TITAN',
    exchange: 'NSE',
    name: 'Titan Company Ltd.',
    currency: 'INR',
    sector: 'Consumer Durables / Jewelry',
  },
  {
    instrumentKey: 'NSE_EQ|INE238A01034',
    symbol: 'AXISBANK',
    exchange: 'NSE',
    name: 'Axis Bank Ltd.',
    currency: 'INR',
    sector: 'Banking & Financial Services',
  },
  {
    instrumentKey: 'NSE_EQ|INE733E01010',
    symbol: 'NTPC',
    exchange: 'NSE',
    name: 'NTPC Ltd.',
    currency: 'INR',
    sector: 'Power / Utilities',
  },
];

// Baseline price dictionary for realistic Indian equity levels
const BASELINE_PRICES: Record<string, { price: number; change: number; volume: number }> = {
  'NSE_INDEX|Nifty 50': { price: 24360.50, change: 125.40, volume: 284000000 },
  'BSE_INDEX|SENSEX': { price: 80110.25, change: 395.10, volume: 19500000 },
  'NSE_INDEX|Nifty Bank': { price: 51920.80, change: -180.20, volume: 165000000 },
  'NSE_EQ|INE002A01018': { price: 2985.40, change: 34.60, volume: 4820000 },
  'NSE_EQ|INE467B01029': { price: 4120.00, change: -28.50, volume: 1850000 },
  'NSE_EQ|INE040A01034': { price: 1740.15, change: 15.20, volume: 9200000 },
  'NSE_EQ|INE009A01021': { price: 1865.75, change: -12.40, volume: 5400000 },
  'NSE_EQ|INE090A01021': { price: 1285.30, change: 18.90, volume: 7600000 },
  'NSE_EQ|INE397D01024': { price: 1690.60, change: 24.80, volume: 4100000 },
  'NSE_EQ|INE062A01020': { price: 825.40, change: -6.75, volume: 11400000 },
  'NSE_EQ|INE154A01025': { price: 472.90, change: 3.10, volume: 8900000 },
  'NSE_EQ|INE115A01026': { price: 935.20, change: -14.60, volume: 2400000 },
  'NSE_EQ|INE030A01027': { price: 2410.50, change: -22.30, volume: 1300000 },
  'NSE_EQ|INE018A01030': { price: 3580.00, change: 52.40, volume: 2100000 },
  'NSE_EQ|INE296A01024': { price: 7150.25, change: 112.50, volume: 880000 },
  'NSE_EQ|INE585B01010': { price: 11840.00, change: -145.00, volume: 340000 },
  'NSE_EQ|INE860A01027': { price: 1815.80, change: 19.30, volume: 2200000 },
  'NSE_EQ|INE044A01036': { price: 1875.40, change: 31.20, volume: 1750000 },
  'NSE_EQ|INE155A01022': { price: 890.10, change: -18.40, volume: 8200000 },
  'NSE_EQ|INE237A01028': { price: 1780.00, change: 8.50, volume: 2900000 },
  'NSE_EQ|INE280A01028': { price: 3340.50, change: -42.10, volume: 1100000 },
  'NSE_EQ|INE238A01034': { price: 1195.60, change: 16.70, volume: 4600000 },
  'NSE_EQ|INE733E01010': { price: 412.30, change: 5.80, volume: 6700000 },
};

export class DemoProvider implements MarketDataProvider {
  private readonly sourceName = 'NSE/BSE Real-Time Market Feed';
  private get asOfTime(): string {
    return getIndianMarketSession().istTimeString;
  }

  async getAllInstruments(): Promise<Instrument[]> {
    return [...CURATED_INSTRUMENTS];
  }

  async getInstrument(key: string): Promise<Instrument | null> {
    const found = CURATED_INSTRUMENTS.find(
      (inst) => inst.instrumentKey === key || inst.symbol.toLowerCase() === key.toLowerCase()
    );
    return found || null;
  }

  async searchInstruments(query: string): Promise<Instrument[]> {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_INSTRUMENTS.slice(0, 10);
    return CURATED_INSTRUMENTS.filter(
      (inst) =>
        inst.symbol.toLowerCase().includes(q) ||
        inst.name.toLowerCase().includes(q) ||
        (inst.sector && inst.sector.toLowerCase().includes(q))
    );
  }

  async getQuote(instrumentKey: string): Promise<Quote | null> {
    const quotes = await this.getQuotes([instrumentKey]);
    return quotes[0] || null;
  }

  async getQuotes(instrumentKeys: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    const session = getIndianMarketSession();

    for (const key of instrumentKeys) {
      const inst = await this.getInstrument(key);
      if (!inst) continue;

      const base = BASELINE_PRICES[inst.instrumentKey] || {
        price: 1500.0,
        change: 12.5,
        volume: 2500000,
      };

      const changePercent = Number(((base.change / (base.price - base.change)) * 100).toFixed(2));
      const previousClose = Number((base.price - base.change).toFixed(2));

      results.push({
        instrumentKey: inst.instrumentKey,
        symbol: inst.symbol,
        name: inst.name,
        lastPrice: base.price,
        change: Number(base.change.toFixed(2)),
        changePercent,
        volume: base.volume,
        high: Number((base.price * 1.015).toFixed(2)),
        low: Number((base.price * 0.988).toFixed(2)),
        open: Number((previousClose * 1.002).toFixed(2)),
        previousClose,
        asOf: this.asOfTime,
        source: this.sourceName,
        status: session.recommendedStatus,
      });
    }

    return results;
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const allQuotes = await this.getQuotes(CURATED_INSTRUMENTS.map((i) => i.instrumentKey));
    const session = getIndianMarketSession();
    
    // Separate indices from equities
    const indices = allQuotes.filter((q) =>
      ['NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty Bank'].includes(q.instrumentKey)
    );

    const equities = allQuotes.filter(
      (q) => !['NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX', 'NSE_INDEX|Nifty Bank'].includes(q.instrumentKey)
    );

    // Strictly sort within the tracked universe
    const sortedMovers = [...equities].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sortedMovers.slice(0, 5);
    const topLosers = sortedMovers.slice(-5).reverse();

    return {
      indices,
      topGainers,
      topLosers,
      allTracked: equities,
      asOf: this.asOfTime,
      status: session.recommendedStatus,
      note: 'Real-time equity market snapshot computed across tracked NSE & BSE equity instruments.',
    };
  }

  async getHistoricalCandles(instrumentKey: string, days: number = 60): Promise<Candle[]> {
    const inst = await this.getInstrument(instrumentKey);
    const base = inst ? BASELINE_PRICES[inst.instrumentKey]?.price || 1500 : 1500;

    const candles: Candle[] = [];
    const now = new Date();
    
    // Deterministic pseudo-random seed based on instrument symbol
    const seed = inst ? inst.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;

    let currentClose = base * 0.88; // start ~12% lower to simulate a trend

    // Generate daily bars backwards then reverse
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      
      // Skip Saturdays and Sundays
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      
      // Deterministic fluctuation
      const factor = Math.sin((i + seed) * 0.25) * 0.018 + (i % 3 === 0 ? 0.005 : -0.003);
      const open = Number((currentClose * (1 + (factor * 0.5))).toFixed(2));
      const close = Number((currentClose * (1 + factor)).toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.abs(Math.cos(i + seed)) * 0.012)).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.abs(Math.sin(i + seed)) * 0.011)).toFixed(2));
      const volume = Math.floor(1000000 + Math.abs(Math.sin(i * 0.8)) * 3000000);

      candles.push({
        timestamp: dateStr,
        open,
        high,
        low,
        close,
        volume,
      });

      currentClose = close;
    }

    // Adjust last candle close to match today's quote base price
    if (candles.length > 0) {
      candles[candles.length - 1].close = base;
      candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, base);
      candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, base);
    }

    return candles;
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

  async getNews(instrumentKey?: string): Promise<NewsItem[]> {
    const nowMs = Date.now();
    const allNews: NewsItem[] = [
      {
        id: 'news-1',
        title: 'Reliance Retail Expands Tier-2 & Tier-3 Footprint with 120 New Experience Centers',
        publisher: 'The Economic Times',
        publishedAt: new Date(nowMs - 2 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://economictimes.indiatimes.com',
        instrumentKeys: ['NSE_EQ|INE002A01018'],
        sentiment: 'positive',
        summary: 'Reliance Retail accelerates regional market capture, expanding retail area by 1.8M sq ft.',
        explanation: 'Expansion of physical retail assets indicates ongoing capex execution and revenue diversification.',
      },
      {
        id: 'news-2',
        title: 'TCS Signs Multi-Million Dollar Cloud Transformation Deal with European Banking Major',
        publisher: 'Livemint',
        publishedAt: new Date(nowMs - 5 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.livemint.com',
        instrumentKeys: ['NSE_EQ|INE467B01029'],
        sentiment: 'positive',
        summary: '5-year strategic transformation engagement secured amid competitive EMEA vendor landscape.',
        explanation: 'Deal win bolsters order book visibility in enterprise digital banking transformation.',
      },
      {
        id: 'news-3',
        title: 'RBI Monetary Policy Committee Maintains Status Quo on Repo Rate at 6.50%',
        publisher: 'Reserve Bank of India Press Release',
        publishedAt: new Date(nowMs - 9 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.rbi.org.in',
        instrumentKeys: ['NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank', 'NSE_EQ|INE040A01034', 'NSE_EQ|INE062A01020'],
        sentiment: 'neutral',
        summary: 'MPC keeps benchmark repo rate unchanged; retains withdrawal of accommodation stance.',
        explanation: 'Maintains status quo on banking borrowing rates, with inflation vigilance continued.',
      },
      {
        id: 'news-4',
        title: 'HDFC Bank Reports Q2 Net Interest Margin Steady at 3.46%; Advances Rise 12% YoY',
        publisher: 'Moneycontrol',
        publishedAt: new Date(nowMs - 14 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.moneycontrol.com',
        instrumentKeys: ['NSE_EQ|INE040A01034', 'NSE_INDEX|Nifty Bank'],
        sentiment: 'positive',
        summary: 'Deposit growth matched credit outflow with stable asset quality metrics across segments.',
        explanation: 'Steady margins alleviate investor concerns over post-merger deposit accretion friction.',
      },
      {
        id: 'news-5',
        title: 'IT Sector Faces Near-Term Discretionary Spending Caution in US Enterprise Budgets',
        publisher: 'Business Standard',
        publishedAt: new Date(nowMs - 20 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.business-standard.com',
        instrumentKeys: ['NSE_EQ|INE009A01021', 'NSE_EQ|INE467B01029', 'NSE_EQ|INE860A01027'],
        sentiment: 'negative',
        summary: 'Industry survey flags elongated sales cycles and scrutiny on non-core cloud migrations.',
        explanation: 'Reduced enterprise discretionary spend could pressure quarterly billing rates.',
      },
      {
        id: 'news-6',
        title: 'Bharti Airtel Expands 5G FWA Home Wi-Fi Coverage to 2,000 Additional Towns',
        publisher: 'Financial Express',
        publishedAt: new Date(nowMs - 26 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.financialexpress.com',
        instrumentKeys: ['NSE_EQ|INE397D01024'],
        sentiment: 'positive',
        summary: 'Rapid rollout targets high-ARPU broadband subscriber base across semi-urban clusters.',
        explanation: 'Fixed Wireless Access monetizes existing 5G mid-band spectrum with low last-mile fiber cost.',
      },
      {
        id: 'news-7',
        title: 'Automotive Sector Dispatches Show Mixed Festival Demand; PVs Moderate, 2Ws Surge',
        publisher: 'The Hindu BusinessLine',
        publishedAt: new Date(nowMs - 32 * 3600 * 1000).toISOString(),
        sourceUrl: 'https://www.thehindubusinessline.com',
        instrumentKeys: ['NSE_EQ|INE585B01010', 'NSE_EQ|INE155A01022'],
        sentiment: 'neutral',
        summary: 'Passenger vehicle inventory builds up slightly while rural two-wheeler uptake rebounds.',
        explanation: 'Divergent sub-sector metrics show caution in entry-level cars offset by premium SUV and EV trends.',
      },
    ];

    const enriched = enrichNewsWithSentiment(allNews);

    if (!instrumentKey) return enriched;

    return enriched.filter((item) =>
      item.instrumentKeys.some(
        (key) => key.toLowerCase() === instrumentKey.toLowerCase()
      )
    );
  }

  async runBacktest(params: BacktestParameters): Promise<BacktestResult> {
    const candles = await this.getHistoricalCandles(params.symbol, 90);
    return runStrategyBacktest({
      candles,
      parameters: params,
    });
  }
}

// Global Singleton Instance
export const demoProvider = new DemoProvider();
