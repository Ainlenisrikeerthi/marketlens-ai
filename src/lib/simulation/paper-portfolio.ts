/**
 * Paper Portfolio Simulation Engine (SOW Section 3 M4 & Section 8)
 * 
 * STRICT COMPLIANCE RULES:
 * 1. SIMULATED — NOT LIVE TRADING. Zero broker order endpoints exist in this system.
 * 2. Virtual capital accounting: Cash + Holdings Market Value = Total Portfolio Equity.
 * 3. Enforces cash sufficiency on simulated BUY orders.
 * 4. Enforces position quantity on simulated SELL orders.
 * 5. Applies realistic 0.10% Indian statutory & execution fee model.
 */

export interface PaperHolding {
  instrumentKey: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface PaperTradeRecord {
  id: string;
  timestamp: string;
  instrumentKey: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fees: number;
  total: number;
  realizedPnL?: number;
}

export interface PaperPortfolio {
  id: string;
  name: string;
  startingCash: number;
  cashBalance: number;
  holdingsValue: number;
  totalEquity: number;
  totalRealizedPnL: number;
  holdings: PaperHolding[];
  trades: PaperTradeRecord[];
  lastUpdated: string;
  disclaimer: string;
}

class InMemoryPaperPortfolioManager {
  private portfolio: PaperPortfolio;

  constructor(initialCash: number = 500000) {
    this.portfolio = this.createDefaultPortfolio(initialCash);
  }

  private createDefaultPortfolio(initialCash: number): PaperPortfolio {
    return {
      id: 'default-paper-portfolio',
      name: 'Primary Virtual Simulation Account',
      startingCash: initialCash,
      cashBalance: initialCash,
      holdingsValue: 0,
      totalEquity: initialCash,
      totalRealizedPnL: 0,
      holdings: [],
      trades: [],
      lastUpdated: new Date().toISOString(),
      disclaimer: 'SIMULATED — NOT LIVE TRADING. Zero real capital at risk.',
    };
  }

  getPortfolio(): PaperPortfolio {
    return { ...this.portfolio };
  }

  reset(startingCash: number = 500000): PaperPortfolio {
    this.portfolio = this.createDefaultPortfolio(startingCash);
    return this.getPortfolio();
  }

  executeSimulatedOrder(params: {
    instrumentKey: string;
    symbol: string;
    name: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
  }): { success: boolean; message: string; portfolio: PaperPortfolio } {
    const { instrumentKey, symbol, name, side, quantity, price } = params;

    if (quantity <= 0 || price <= 0) {
      return {
        success: false,
        message: 'Order quantity and execution price must be strictly positive.',
        portfolio: this.getPortfolio(),
      };
    }

    const principal = quantity * price;
    const feeRate = 0.001; // 0.10% estimated fee
    const fees = Number((principal * feeRate).toFixed(2));
    const timestamp = new Date().toISOString();

    if (side === 'BUY') {
      const totalOutlay = Number((principal + fees).toFixed(2));
      if (this.portfolio.cashBalance < totalOutlay) {
        return {
          success: false,
          message: `Insufficient virtual cash. Required ₹${totalOutlay.toLocaleString('en-IN')}, available ₹${this.portfolio.cashBalance.toLocaleString('en-IN')}.`,
          portfolio: this.getPortfolio(),
        };
      }

      this.portfolio.cashBalance = Number((this.portfolio.cashBalance - totalOutlay).toFixed(2));

      // Update holdings
      const existing = this.portfolio.holdings.find((h) => h.instrumentKey === instrumentKey);
      if (existing) {
        const totalCost = existing.averageBuyPrice * existing.quantity + principal;
        const totalQty = existing.quantity + quantity;
        existing.averageBuyPrice = Number((totalCost / totalQty).toFixed(2));
        existing.quantity = totalQty;
        existing.currentPrice = price;
        existing.currentValue = Number((existing.quantity * price).toFixed(2));
        existing.unrealizedPnL = Number(((price - existing.averageBuyPrice) * existing.quantity).toFixed(2));
        existing.unrealizedPnLPercent = Number((((price - existing.averageBuyPrice) / existing.averageBuyPrice) * 100).toFixed(2));
      } else {
        this.portfolio.holdings.push({
          instrumentKey,
          symbol,
          name,
          quantity,
          averageBuyPrice: price,
          currentPrice: price,
          currentValue: Number(principal.toFixed(2)),
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
        });
      }

      const tradeRecord: PaperTradeRecord = {
        id: `pt-${Date.now()}-${this.portfolio.trades.length + 1}`,
        timestamp,
        instrumentKey,
        symbol,
        side: 'BUY',
        quantity,
        price,
        fees,
        total: totalOutlay,
      };
      this.portfolio.trades.unshift(tradeRecord);
    } else {
      // SELL ORDER
      const existingIndex = this.portfolio.holdings.findIndex((h) => h.instrumentKey === instrumentKey);
      if (existingIndex === -1 || this.portfolio.holdings[existingIndex].quantity < quantity) {
        const availableQty = existingIndex >= 0 ? this.portfolio.holdings[existingIndex].quantity : 0;
        return {
          success: false,
          message: `Insufficient holdings to sell. Requested ${quantity} shares, holding ${availableQty} shares.`,
          portfolio: this.getPortfolio(),
        };
      }

      const holding = this.portfolio.holdings[existingIndex];
      const grossRevenue = principal;
      const netProceeds = Number((grossRevenue - fees).toFixed(2));
      const costBasis = Number((holding.averageBuyPrice * quantity).toFixed(2));
      const realizedPnL = Number((netProceeds - costBasis).toFixed(2));

      this.portfolio.cashBalance = Number((this.portfolio.cashBalance + netProceeds).toFixed(2));
      this.portfolio.totalRealizedPnL = Number((this.portfolio.totalRealizedPnL + realizedPnL).toFixed(2));

      holding.quantity -= quantity;
      if (holding.quantity === 0) {
        this.portfolio.holdings.splice(existingIndex, 1);
      } else {
        holding.currentPrice = price;
        holding.currentValue = Number((holding.quantity * price).toFixed(2));
        holding.unrealizedPnL = Number(((price - holding.averageBuyPrice) * holding.quantity).toFixed(2));
        holding.unrealizedPnLPercent = Number((((price - holding.averageBuyPrice) / holding.averageBuyPrice) * 100).toFixed(2));
      }

      const tradeRecord: PaperTradeRecord = {
        id: `pt-${Date.now()}-${this.portfolio.trades.length + 1}`,
        timestamp,
        instrumentKey,
        symbol,
        side: 'SELL',
        quantity,
        price,
        fees,
        total: netProceeds,
        realizedPnL,
      };
      this.portfolio.trades.unshift(tradeRecord);
    }

    // Recompute total holdings value & total equity
    this.portfolio.holdingsValue = Number(
      this.portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0).toFixed(2)
    );
    this.portfolio.totalEquity = Number(
      (this.portfolio.cashBalance + this.portfolio.holdingsValue).toFixed(2)
    );
    this.portfolio.lastUpdated = timestamp;

    return {
      success: true,
      message: `Simulated ${side} order executed for ${quantity} shares of ${symbol} at ₹${price.toFixed(2)}.`,
      portfolio: this.getPortfolio(),
    };
  }
}

export const globalPaperPortfolio = new InMemoryPaperPortfolioManager(500000);
