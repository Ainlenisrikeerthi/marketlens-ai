# MarketLens AI — Real-Time Indian Equity Intelligence & Paper Trading

> **Enterprise Architecture:** Python Django Backend + React (JSX) Frontend + Supabase PostgreSQL & Auth + EODHD Indian Market Data + Google Gemini AI.

MarketLens AI is a professional, portfolio-grade web application engineered for exploring Indian equities through authorized market data, deterministic technical indicators, explainable AI research, news sentiment classification, and zero-capital strategy simulation.

---

## 🛡️ Critical Product Boundaries & Disclaimers

1. **Simulated Paper Trading Only:** The application **never** places real-money broker orders or executes live financial transactions.
2. **Deterministic Indicators:** Technical indicators (SMA 20/50, EMA 20/50, RSI 14) and backtest mechanics are calculated in pure, tested backend algorithms. The LLM never invents prices or calculates mathematical statistics.
3. **No Financial Advisory:** MarketLens AI does not provide personalized investment advice or guarantee financial returns.
4. **Transparent Data Labeling:** All figures are explicitly labeled with conspicuous data-origin badges (`LIVE`, `DELAYED`, `CLOSED`, `STALE`, `DEMO`). Fixtures are never mixed with or misrepresented as live market data.
5. **No Client Secret Exposure:** API credentials (EODHD token, Google Gemini API key, Supabase service role key) reside exclusively in backend environment variables and are never transmitted to client bundles.

---

## 📦 Final Technology Stack

- **Frontend:**
  - React 18 (Pure JavaScript / JSX)
  - Vite 6
  - Tailwind CSS 3
  - React Router v6
  - Lucide React (Icons)
  - TradingView Lightweight Charts (v4 Candlesticks & Technical Overlays)
- **Backend:**
  - Python 3.12
  - Django 5 / 6 + Django REST Framework (DRF)
  - Django CORS Headers
  - Requests / HTTP clients
- **Database & Authentication:**
  - Supabase PostgreSQL
  - Supabase Authentication (Email/Password with Row Level Security)
- **External APIs:**
  - **EODHD:** Indian equity quotes, indices, fundamentals & historical candles
  - **Google Gemini API:** AI-powered executive stock summaries & sentiment synthesis

---

## 📂 Project Structure

```
trading bot/
├── frontend/
│   ├── public/
│   │   ├── _redirects            # SPA redirect rule for Netlify
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/           # TradingViewChart.jsx
│   │   │   ├── layout/           # Navbar.jsx, Footer.jsx
│   │   │   ├── market/           # InstrumentSwitcher.jsx, MoversWidget.jsx
│   │   │   ├── stocks/           # CompanyFundamentalsCard.jsx
│   │   │   └── ui/               # StatusBadge.jsx
│   │   ├── lib/
│   │   │   ├── api.js            # Unified backend fetch utility
│   │   │   └── supabase.js       # Supabase client initialization
│   │   ├── pages/
│   │   │   ├── Alerts.jsx        # Price alerts & threshold notifications
│   │   │   ├── Auth.jsx          # Supabase Sign In / Register / Guest
│   │   │   ├── Dashboard.jsx     # Live market overview, indices & movers
│   │   │   ├── Landing.jsx       # Public landing page & feature highlights
│   │   │   ├── NewsRadar.jsx     # Market news & sentiment analysis
│   │   │   ├── NotFound.jsx      # Clean 404 page with navigation
│   │   │   ├── StockResearch.jsx # Candlestick charts, fundamentals & Gemini AI
│   │   │   ├── StrategyLab.jsx   # Zero-capital backtesting & paper portfolio
│   │   │   └── Watchlist.jsx     # User watchlist & daily AI briefing
│   │   ├── App.jsx               # React Router route registry
│   │   ├── index.css             # Tailwind CSS styles & dark theme
│   │   └── main.jsx              # React DOM entry point
│   ├── .env.example              # Public frontend environment template
│   ├── index.html                # Vite HTML shell
│   ├── package.json              # Clean dependencies (Zero TypeScript)
│   ├── tailwind.config.js        # Custom colors & styling
│   ├── vercel.json               # SPA routing rewrite for Vercel
│   └── vite.config.js            # Vite configuration with /api proxy
│
├── backend/
│   ├── apps/
│   │   ├── accounts/             # Supabase JWT authentication
│   │   ├── alerts/               # Price alerts & evaluation engine
│   │   ├── analysis/             # Technical indicators & Gemini AI analysis
│   │   ├── market/               # EODHD data provider & fallback fixtures
│   │   ├── news/                 # Market news & sentiment
│   │   ├── strategy/             # Backtesting & paper trading engine
│   │   └── watchlist/            # User watchlists with Supabase persistence
│   ├── config/
│   │   ├── asgi.py
│   │   ├── settings.py           # Production-ready Django settings
│   │   ├── urls.py               # Master API routing (/api/...)
│   │   └── wsgi.py
│   ├── .env.example              # Backend secrets environment template
│   ├── manage.py
│   └── requirements.txt          # Python dependencies
│
├── .gitignore                    # Clean Git ignore rules (no node_modules, no secrets)
└── README.md                     # Comprehensive project documentation
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **Supabase** account (Free tier)
- **EODHD** API key (for Indian market quotes)
- **Google Gemini** API key (for AI analysis)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env
# Edit .env with your Supabase, EODHD, and Gemini credentials

# Apply migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver 8000
```
Backend API will be accessible at: `http://127.0.0.1:8000/api/`

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env
# Fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser. All `/api` calls are automatically forwarded to Django via the Vite proxy.

---

## 🔐 Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon / Publishable key |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon key |
| `VITE_API_URL` | Production Django API URL (leave blank for local dev) |

### Backend (`backend/.env`)
| Variable | Description |
| :--- | :--- |
| `DJANGO_SECRET_KEY` | Unique Django secret key |
| `DEBUG` | Set to `False` in production, `True` in local development |
| `ALLOWED_HOSTS` | Comma-separated list of allowed domains |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of permitted frontend URLs |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) |
| `EODHD_API_KEY` | EODHD API token for Indian market data |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key for stock analysis |
| `CRON_SECRET` | Secret token for triggering alert evaluations via cron |

---

## 🌐 Deployment Instructions

### Deploying Frontend (Vercel or Netlify)
1. Push your repository to GitHub.
2. In **Vercel** or **Netlify**, import the repository:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://marketlens-api.onrender.com`)
4. Deploy! Both `_redirects` and `vercel.json` are included to guarantee SPA client routing without 404s on page refresh.

### Deploying Backend (Render or Railway)
1. In **Render** or **Railway**, create a new Web Service pointing to your repository:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
2. Configure Environment Variables as specified in `backend/.env.example`. Set `DEBUG=False`.
3. Add your frontend deployment domain to `CORS_ALLOWED_ORIGINS` and `ALLOWED_HOSTS`.

---

## 📄 License
MIT License. MarketLens AI is built for educational, analytical, and simulated paper-trading purposes only.
