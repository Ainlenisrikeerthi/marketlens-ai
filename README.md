# MarketLens AI — Indian Stock Market Intelligence & Paper Trading

> **Phase P1 (Foundation) & Phase P2 (Data Integration) — Implementation Complete**  
> Built strictly in accordance with [MarketLens_AI_SOW.md](./MarketLens_AI_SOW.md) specifications.

MarketLens AI is a professional, portfolio-grade web application engineered for exploring Indian equities through authorized market data, deterministic technical indicators, explainable AI research, news sentiment classification, and zero-capital strategy simulation.

---

## 🛡️ Critical Product Boundaries & Disclaimers

1. **Simulated Paper Trading Only:** The application **never** places real-money broker orders or executes live financial transactions.
2. **Deterministic Indicators:** Technical indicators (SMA 20/50, EMA 20/50, RSI 14) and backtest mechanics are calculated in pure, tested application logic. The LLM never invents prices or calculates mathematical statistics.
3. **No Financial Advisory:** MarketLens AI does not provide personalized investment advice or guarantee financial returns.
4. **Transparent Data Labeling:** All figures are explicitly labeled with conspicuous data-origin badges (`LIVE`, `DELAYED`, `CLOSED`, `STALE`, `DEMO`). Fixtures are never mixed with or misrepresented as live market data.
5. **Look-Ahead Bias Prevention:** Strategy backtest signals are evaluated at bar close with simulated fills calculated **no earlier than the open of the next available bar**, incorporating brokerage fees and slippage models.
6. **No Client Secret Exposure:** API credentials (such as Upstox Analytics Tokens) reside exclusively in server-side environment variables and are never transmitted to client bundles or printed in error traces.

---

## 📦 Technology Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS (Dark navy/charcoal fintech theme, accessible emerald/rose signed figures)
- **Charting:** TradingView Lightweight Charts™ v5 (Candlestick series with responsive observer)
- **Validation:** Zod schemas for API input validation and contract enforcement
- **Rate Limiting:** Sliding-window in-memory rate limiter (120 req/min per IP)
- **Caching:** Multi-tier server memory cache with TTL (10s live, 60s market closed, 1h candles, 5m news)
- **Testing:** Vitest test suite (24 tests across 4 suites)
- **Market Data Providers:**
  - `UpstoxProvider`: Authorized Upstox Analytics Token API (v3 Market Quotes, v2 Historical Candles, v2 Equity News)
  - `DemoProvider`: Zero-config deterministic synthetic fixture generator with automatic fallback

---

## 🗺️ Operational Routes & Pages

| Route | Name | Key Functionality | Data Source |
| :--- | :--- | :--- | :--- |
| `/` | **Landing / Entry** | Hero overview, benchmark ticker bar, architecture pillars, zero-capital compliance notices. | Dynamic |
| `/dashboard` | **Market Overview** | Benchmark index cards (NIFTY 50, SENSEX, BANK NIFTY), 20-stock curated universe table with live search/filtering, interactive chart preview, and strictly universe-scoped Top Gainers/Losers. | Upstox / Demo Fallback |
| `/stocks/[instrument]` | **Stock Research** | Dynamic instrument switcher, interactive Lightweight Charts candlestick view, deterministic indicator calculations (SMA, EMA, RSI), and grounded AI research card with observations, risks, and uncertainties. | Upstox / Demo Fallback |
| `/news` | **News & Sentiment Radar** | Attributed Indian financial news stream, publisher links, sentiment classifications (`positive`, `negative`, `neutral`, `unclear`), and evidence disclaimers. | Upstox / Curated Fixture |
| `/strategy` | **Strategy Lab** | Parameterized SMA Crossover and RSI Threshold backtesting, next-bar fill simulation, fee/slippage modeling, win rate, drawdown, and trade ledger. Labeled `SIMULATED — NOT LIVE TRADING`. | Deterministic Simulator |
| `/watchlist` | **Watchlist & Alerts** | User portfolio watchlist, threshold condition configuration (≥ / ≤), in-app triggered event persistence, and on-demand AI briefing. | Local / Server Persisted |
| `/auth` | **Authentication** | Sign in / sign up portal with one-click **Demo Visitor Mode** (prepared for Supabase Auth in Phase P5). | Local / Session |

---

## ⚡ Internal API Endpoints

- `GET /api/health` — System health check, active provider type (`UPSTOX` / `DEMO`), IST session status, cache stats.
- `GET /api/market/overview` — Benchmark indices, 20 tracked equities quotes, top movers, freshness metadata.
- `GET /api/instruments/search?q=` — Case-insensitive instrument search across symbols and company names (rate limited, Zod validated).
- `GET /api/stocks/[key]/history?days=` — Historical daily OHLCV candles (rate limited, Zod validated, 1-hour cache).
- `GET /api/stocks/[key]/analysis` — Deterministic indicator values, grounded trend observations, risks, and sources.
- `GET /api/news?instrument=` — Attributed news items with classified sentiment and source URLs (rate limited, 5-minute cache).
- `POST /api/backtests` — Zod-validated strategy backtest runner returning equity curve and trade ledger (rate limited).
- `GET, POST /api/portfolio` — Virtual paper portfolio retrieval, simulated order execution, and cash reset.
- `GET, POST /api/watchlists` — Watchlist retrieval and item addition.
- `GET, POST, PATCH /api/alerts` — Threshold alert rule management and persisted event feed.

---

## 🔑 Upstox Market Data Setup (Phase P2)

MarketLens AI connects directly to Upstox's official market data API using an authorized **Analytics Token**:

### How to Obtain an Upstox Analytics Token:
1. Log in to the [Upstox Developer Apps Portal](https://account.upstox.com/developer/apps).
2. Create or select your application.
3. Navigate to the **Analytics** tab.
4. Click **Generate Analytics Token** (Free, 1-year validity, read-only, no static IP required for market data APIs).
5. Copy the generated token string.

### Enabling Live Market Data:
Add the token to your local `.env.local` file:
```bash
UPSTOX_ANALYTICS_TOKEN=your_upstox_analytics_token_here
```

### Zero-Config Graceful Demo Fallback:
If `UPSTOX_ANALYTICS_TOKEN` is unset or blank, or if the Upstox API is unreachable or returns an HTTP error, MarketLens AI **automatically and transparently falls back to `DemoProvider`** with conspicuous `DEMO` badges displayed across all UI views. No configuration is required to run the application offline or in demo mode.

---

## 🚀 How to Run the Project Locally

### Prerequisites
- **Node.js:** v20.x or v22.x
- **npm:** v10.x or later

### Step 1: Clone or Navigate to the Project Root
```bash
cd "trading bot"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(Optional: add `UPSTOX_ANALYTICS_TOKEN` to connect live Upstox market data. Leave blank to run in Demo mode).*

### Step 4: Run Deterministic Unit Tests
```bash
npm test
```
All 51 unit tests across 9 test suites will execute:
```text
✓ src/tests/paper-portfolio.test.ts (6 tests)
✓ src/tests/indicators.test.ts (8 tests)
✓ src/tests/rate-limiter.test.ts (3 tests)
✓ src/tests/news-sentiment.test.ts (5 tests)
✓ src/tests/backtest-engine.test.ts (5 tests)
✓ src/tests/market-hours.test.ts (4 tests)
✓ src/tests/upstox-provider.test.ts (9 tests)
✓ src/tests/stock-research.test.ts (3 tests)
✓ src/tests/demo-provider.test.ts (8 tests)

Test Files  9 passed (9)
     Tests  51 passed (51)
```

### Step 5: Start the Local Development Server
```bash
npm run dev
```
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

### Step 6: Validate System Health
```bash
curl http://localhost:3000/api/health
```

### Step 7: Validate Production Build
```bash
npm run build
npm start
```

---

## 🧪 Test Verification Summary

The test suites verify:
1. **Benchmark Indices:** Exactly 3 major Indian indices (NIFTY 50, SENSEX, BANK NIFTY).
2. **Curated Universe:** 20 verified NSE equities with valid ISINs and currency in INR.
3. **Upstox Adapter Normalization:** Correctly extracts `last_price`, `prev_close_price`, `year_high`, `year_low`, and parses colon-formatted keys (`NSE_EQ:RELIANCE`) and numeric timestamps.
4. **Historical Candles Invariants:** Upstox V2 candles array format `[timestamp, open, high, low, close, volume, oi]` correctly converted to chronological daily bars.
5. **Graceful Demo Fallback:** 401 Unauthorized or network failures transparently fall back to demo fixtures with `DEMO` status tags.
6. **Token Protection:** API secrets are completely shielded and never exposed in responses or error logs.
7. **Rate Limiting:** Sliding-window rate limiter enforces per-IP quotas and rejects excess traffic with HTTP 429.
8. **Deterministic Math:** Technical indicators compute SMA(20/50), EMA(20/50), and RSI(14) with mathematical accuracy.
9. **Backtest Accounting:** Fee deductions, slippage adjustments, and next-bar execution guarantees.

---

## 🏁 Phase P2 Acceptance Gate Checkpoint

- [x] Upstox adapter fully wired (`getQuotes`, `getHistoricalCandles`, `getNews`, `getMarketOverview`)
- [x] Correct normalized response from authorized Upstox v3 API
- [x] No client secret exposure (never in client bundles, never in error logs)
- [x] Graceful fallback to `DemoProvider` when token is absent or API fails
- [x] Freshness caching active (10s live, 60s market closed, 3600s candles, 300s news)
- [x] API routes upgraded with dynamic `status` (`LIVE`, `DELAYED`, `CLOSED`, `STALE`, `DEMO`)
- [x] Sliding-window rate limiting active across API routes
- [x] System diagnostic `/api/health` endpoint operational
- [x] 24/24 Vitest unit tests passing with 100% success rate
- [x] Production build (`npm run build`) compiles cleanly (39 static and dynamic routes)
