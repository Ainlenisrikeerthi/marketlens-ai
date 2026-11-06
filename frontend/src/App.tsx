import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

import { LandingPage } from './pages/Landing';
import { DashboardPage } from './pages/Dashboard';
import { StockResearchPage } from './pages/StockResearch';
import { NewsRadarPage } from './pages/NewsRadar';
import { StrategyLabPage } from './pages/StrategyLab';
import { WatchlistPage } from './pages/Watchlist';
import { AlertsPage } from './pages/Alerts';
import { AuthPage } from './pages/Auth';

export function App() {
  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-[#f1f5f9]">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/stocks/:instrument" element={<StockResearchPage />} />
          <Route path="/news" element={<NewsRadarPage />} />
          <Route path="/strategy" element={<StrategyLabPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
