// Canonical MarketLens AI Types conforming to SOW Section 7

export type DataStatus = 'LIVE' | 'DELAYED' | 'CLOSED' | 'STALE' | 'DEMO';

export interface Instrument {
  instrumentKey: string;
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'INDEX';
  name: string;
  currency: 'INR';
  sector?: string;
  isIndex?: boolean;
}

export interface Quote {
  instrumentKey: string;
  symbol: string;
  name: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  yearHigh?: number;
  yearLow?: number;
  asOf: string; // ISO-8601
  source: string;
  status: DataStatus;
}

export interface Candle {
  timestamp: string; // ISO-8601 or YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SentimentType = 'positive' | 'negative' | 'neutral' | 'unclear';

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string; // ISO-8601
  sourceUrl: string;
  instrumentKeys: string[];
  sentiment: SentimentType;
  summary?: string;
  explanation?: string;
}

export interface TechnicalIndicators {
  sma20?: number;
  sma50?: number;
  ema20?: number;
  ema50?: number;
  rsi14?: number;
}

export interface AnalysisSource {
  label: string;
  url: string;
}

export interface StockAnalysis {
  instrumentKey: string;
  symbol: string;
  asOf: string; // ISO-8601
  indicators: TechnicalIndicators;
  summary: string;
  observations: string[];
  risks: string[];
  uncertainties?: string[];
  sources: AnalysisSource[];
  dataQualityWarnings: string[];
  status: DataStatus;
}

export interface BacktestParameters {
  symbol: string;
  strategy: 'SMA_CROSSOVER' | 'RSI_THRESHOLD';
  startDate: string;
  endDate: string;
  startingCapital: number;
  positionSizePercent: number;
  estimatedFeePercent: number;
  estimatedSlippagePercent: number;
  smaFast?: number;
  smaSlow?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}

export interface BacktestTrade {
  id: string;
  date: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fees: number;
  netPnl?: number;
  reason: string;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  benchmarkEquity: number;
}

export interface BacktestMetrics {
  totalReturnPercent: number;
  benchmarkReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePercent: number;
  maxDrawdownPercent: number;
  finalEquity: number;
  sharpeRatioEstimate?: number;
}

export interface BacktestResult {
  parameters: BacktestParameters;
  trades: BacktestTrade[];
  equityCurve: EquityCurvePoint[];
  metrics: BacktestMetrics;
  benchmark: {
    symbol: string;
    totalReturnPercent: number;
    buyAndHoldFinalEquity: number;
  };
  warnings: string[];
  status: DataStatus;
}

export interface MarketOverview {
  indices: Quote[];
  topGainers: Quote[];
  topLosers: Quote[];
  allTracked: Quote[];
  asOf: string;
  status: DataStatus;
  note: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  items: Instrument[];
}

export interface AlertRule {
  id: string;
  userId: string;
  instrumentKey: string;
  symbol: string;
  operator: 'GREATER_THAN' | 'LESS_THAN';
  threshold: number;
  enabled: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  symbol: string;
  observedValue: number;
  observedAt: string;
  createdAt: string;
}

export interface CompanyFundamentals {
  marketCapCr: number; // in ₹ Crores
  peRatio: number;
  industryPe: number;
  pbRatio: number;
  dividendYieldPercent: number;
  roePercent: number;
  rocePercent: number;
  debtToEquity: number;
  epsTtm: number;
  faceValue: number;
  bookValue: number;
  yearHigh: number;
  yearLow: number;
  beta: number;
  sector: string;
  source: string;
}
