-- MarketLens AI — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Run this in your Supabase SQL Editor or via Supabase CLI

-- ============================================================
-- PROFILES (extends auth.users with app-specific data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INSTRUMENTS (reference table of supported instruments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instruments (
  instrument_key TEXT PRIMARY KEY,
  symbol         TEXT NOT NULL,
  exchange       TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE', 'INDEX')),
  name           TEXT NOT NULL,
  sector         TEXT,
  currency       TEXT NOT NULL DEFAULT 'INR',
  is_index       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — instruments are read-only public reference data
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON public.instruments(symbol);

-- ============================================================
-- WATCHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlists"
  ON public.watchlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);

-- ============================================================
-- WATCHLIST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id    UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_key  TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  name            TEXT NOT NULL,
  exchange        TEXT NOT NULL,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(watchlist_id, instrument_key)
);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist items"
  ON public.watchlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);

-- ============================================================
-- PRICE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_key     TEXT NOT NULL,
  symbol             TEXT NOT NULL,
  operator           TEXT NOT NULL CHECK (operator IN ('GREATER_THAN', 'LESS_THAN')),
  threshold          NUMERIC(14,2) NOT NULL CHECK (threshold > 0),
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at  TIMESTAMPTZ,
  last_checked_at    TIMESTAMPTZ,
  last_checked_price NUMERIC(14,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own price alerts"
  ON public.price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_enabled ON public.price_alerts(enabled) WHERE enabled = TRUE;

-- ============================================================
-- ALERT EVENTS (triggered notification log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alert_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        UUID NOT NULL REFERENCES public.price_alerts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  instrument_key  TEXT NOT NULL,
  operator        TEXT NOT NULL,
  threshold       NUMERIC(14,2) NOT NULL,
  observed_value  NUMERIC(14,2) NOT NULL,
  observed_at     TIMESTAMPTZ NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert events"
  ON public.alert_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert alert events"
  ON public.alert_events FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update own alert events (mark read)"
  ON public.alert_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alert_events_user_id ON public.alert_events(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON public.alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_unread ON public.alert_events(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- BACKTEST RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT NOT NULL,
  strategy        TEXT NOT NULL,
  parameters      JSONB NOT NULL,
  metrics         JSONB NOT NULL,
  trades_count    INTEGER NOT NULL DEFAULT 0,
  equity_curve    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own backtest results"
  ON public.backtest_results FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backtest_results_user_id ON public.backtest_results(user_id);

-- ============================================================
-- PAPER PORTFOLIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paper_portfolios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cash_balance     NUMERIC(14,2) NOT NULL DEFAULT 500000.00,
  initial_capital  NUMERIC(14,2) NOT NULL DEFAULT 500000.00,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.paper_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own paper portfolio"
  ON public.paper_portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.paper_trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id    UUID NOT NULL REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_key  TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  fill_price      NUMERIC(14,2) NOT NULL,
  fees            NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pnl         NUMERIC(14,2),
  reason          TEXT,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own paper trades"
  ON public.paper_trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_paper_trades_portfolio_id ON public.paper_trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id ON public.paper_trades(user_id);
