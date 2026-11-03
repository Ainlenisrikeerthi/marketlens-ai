import { describe, it, expect, beforeEach } from 'vitest';
import { globalPaperPortfolio } from '../lib/simulation/paper-portfolio';

describe('Paper Portfolio Simulation Specification (Phase P4)', () => {
  beforeEach(() => {
    globalPaperPortfolio.reset(500000);
  });

  it('should initialize with default ₹5,00,000 cash and zero holdings', () => {
    const p = globalPaperPortfolio.getPortfolio();
    expect(p.startingCash).toBe(500000);
    expect(p.cashBalance).toBe(500000);
    expect(p.holdings.length).toBe(0);
    expect(p.totalEquity).toBe(500000);
    expect(p.disclaimer).toContain('SIMULATED — NOT LIVE TRADING');
  });

  it('should execute simulated BUY order with cash deduction and 0.10% fee calculation', () => {
    const buyResult = globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      side: 'BUY',
      quantity: 10,
      price: 3000,
    });

    expect(buyResult.success).toBe(true);
    const p = buyResult.portfolio;

    // Principal = 10 * 3000 = 30,000; Fee = 30,000 * 0.001 = 30; Total = 30,030
    expect(p.cashBalance).toBe(500000 - 30030);
    expect(p.holdings.length).toBe(1);
    expect(p.holdings[0].symbol).toBe('RELIANCE');
    expect(p.holdings[0].quantity).toBe(10);
    expect(p.holdings[0].averageBuyPrice).toBe(3000);

    // Balance conservation: Cash + Holdings = Total Equity
    expect(p.totalEquity).toBeCloseTo(p.cashBalance + p.holdingsValue, 2);
  });

  it('should reject simulated BUY orders when virtual cash is insufficient', () => {
    // Attempt to buy ₹10,00,000 worth with ₹5,00,000 balance
    const result = globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE002A01018',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      side: 'BUY',
      quantity: 500,
      price: 3000,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient virtual cash');
    expect(result.portfolio.cashBalance).toBe(500000);
  });

  it('should execute simulated SELL orders and record realized P&L', () => {
    // 1. Buy 20 shares at ₹2,500
    globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE009A01021',
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      side: 'BUY',
      quantity: 20,
      price: 2500,
    });

    // 2. Sell 10 shares at ₹2,800
    const sellResult = globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE009A01021',
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      side: 'SELL',
      quantity: 10,
      price: 2800,
    });

    expect(sellResult.success).toBe(true);
    const p = sellResult.portfolio;

    // Should have 10 remaining shares
    expect(p.holdings.length).toBe(1);
    expect(p.holdings[0].quantity).toBe(10);

    // Revenue = 10 * 2800 = 28,000; Fee = 28; Net = 27,972; Cost = 25,000; Realized PnL = 2,972
    expect(p.totalRealizedPnL).toBeGreaterThan(2900);
  });

  it('should reject simulated SELL orders when attempting to sell more shares than held', () => {
    // Attempt to sell without holding
    const result = globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE467B01029',
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd.',
      side: 'SELL',
      quantity: 5,
      price: 4000,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient holdings to sell');
  });

  it('should reset portfolio to starting capital on demand', () => {
    // Perform trade
    globalPaperPortfolio.executeSimulatedOrder({
      instrumentKey: 'NSE_EQ|INE040A01034',
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      side: 'BUY',
      quantity: 10,
      price: 1600,
    });

    const resetP = globalPaperPortfolio.reset(500000);
    expect(resetP.cashBalance).toBe(500000);
    expect(resetP.holdings.length).toBe(0);
    expect(resetP.trades.length).toBe(0);
    expect(resetP.totalRealizedPnL).toBe(0);
  });
});
