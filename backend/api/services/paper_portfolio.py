"""
Paper Portfolio Simulation Engine.
Port of paper-portfolio.ts.
"""

from datetime import datetime, timezone
import time


class InMemoryPaperPortfolioManager:
    def __init__(self, initial_cash=500000.0):
        self.portfolio = self._create_default_portfolio(initial_cash)

    def _create_default_portfolio(self, initial_cash):
        return {
            'id': 'default-paper-portfolio',
            'name': 'Primary Virtual Simulation Account',
            'startingCash': float(initial_cash),
            'cashBalance': float(initial_cash),
            'holdingsValue': 0.0,
            'totalEquity': float(initial_cash),
            'totalRealizedPnL': 0.0,
            'holdings': [],
            'trades': [],
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'disclaimer': 'SIMULATED — NOT LIVE TRADING. Zero real capital at risk.',
        }

    def get_portfolio(self):
        # Return deep copy of dict
        import copy
        return copy.deepcopy(self.portfolio)

    def reset(self, starting_cash=500000.0):
        self.portfolio = self._create_default_portfolio(starting_cash)
        return self.get_portfolio()

    def execute_simulated_order(self, instrument_key, symbol, name, side, quantity, price):
        if quantity <= 0 or price <= 0:
            return {
                'success': False,
                'message': 'Order quantity and execution price must be strictly positive.',
                'portfolio': self.get_portfolio(),
            }

        principal = quantity * price
        fee_rate = 0.001  # 0.10% fee
        fees = round(principal * fee_rate, 2)
        timestamp = datetime.now(timezone.utc).isoformat()

        if side == 'BUY':
            total_outlay = round(principal + fees, 2)
            if self.portfolio['cashBalance'] < total_outlay:
                return {
                    'success': False,
                    'message': f"Insufficient virtual cash. Required ₹{total_outlay:,.2f}, available ₹{self.portfolio['cashBalance']:,.2f}.",
                    'portfolio': self.get_portfolio(),
                }

            self.portfolio['cashBalance'] = round(self.portfolio['cashBalance'] - total_outlay, 2)

            # Update holdings
            existing = next((h for h in self.portfolio['holdings'] if h['instrumentKey'] == instrument_key), None)
            if existing:
                total_cost = existing['averageBuyPrice'] * existing['quantity'] + principal
                total_qty = existing['quantity'] + quantity
                existing['averageBuyPrice'] = round(total_cost / total_qty, 2)
                existing['quantity'] = total_qty
                existing['currentPrice'] = price
                existing['currentValue'] = round(existing['quantity'] * price, 2)
                existing['unrealizedPnL'] = round((price - existing['averageBuyPrice']) * existing['quantity'], 2)
                existing['unrealizedPnLPercent'] = round(((price - existing['averageBuyPrice']) / existing['averageBuyPrice']) * 100, 2)
            else:
                self.portfolio['holdings'].append({
                    'instrumentKey': instrument_key,
                    'symbol': symbol,
                    'name': name,
                    'quantity': quantity,
                    'averageBuyPrice': price,
                    'currentPrice': price,
                    'currentValue': round(principal, 2),
                    'unrealizedPnL': 0.0,
                    'unrealizedPnLPercent': 0.0,
                })

            trade_record = {
                'id': f"pt-{int(time.time() * 1000)}-{len(self.portfolio['trades']) + 1}",
                'timestamp': timestamp,
                'instrumentKey': instrument_key,
                'symbol': symbol,
                'side': 'BUY',
                'quantity': quantity,
                'price': price,
                'fees': fees,
                'total': total_outlay,
            }
            self.portfolio['trades'].insert(0, trade_record)

        else:
            # SELL ORDER
            existing_index = next((i for i, h in enumerate(self.portfolio['holdings']) if h['instrumentKey'] == instrument_key), None)
            if existing_index is None or self.portfolio['holdings'][existing_index]['quantity'] < quantity:
                available_qty = self.portfolio['holdings'][existing_index]['quantity'] if existing_index is not None else 0
                return {
                    'success': False,
                    'message': f"Insufficient holdings to sell. Requested {quantity} shares, holding {available_qty} shares.",
                    'portfolio': self.get_portfolio(),
                }

            holding = self.portfolio['holdings'][existing_index]
            gross_revenue = principal
            net_proceeds = round(gross_revenue - fees, 2)
            cost_basis = round(holding['averageBuyPrice'] * quantity, 2)
            realized_pnl = round(net_proceeds - cost_basis, 2)

            self.portfolio['cashBalance'] = round(self.portfolio['cashBalance'] + net_proceeds, 2)
            self.portfolio['totalRealizedPnL'] = round(self.portfolio['totalRealizedPnL'] + realized_pnl, 2)

            holding['quantity'] -= quantity
            if holding['quantity'] == 0:
                self.portfolio['holdings'].pop(existing_index)
            else:
                holding['currentPrice'] = price
                holding['currentValue'] = round(holding['quantity'] * price, 2)
                holding['unrealizedPnL'] = round((price - holding['averageBuyPrice']) * holding['quantity'], 2)
                holding['unrealizedPnLPercent'] = round(((price - holding['averageBuyPrice']) / holding['averageBuyPrice']) * 100, 2)

            trade_record = {
                'id': f"pt-{int(time.time() * 1000)}-{len(self.portfolio['trades']) + 1}",
                'timestamp': timestamp,
                'instrumentKey': instrument_key,
                'symbol': symbol,
                'side': 'SELL',
                'quantity': quantity,
                'price': price,
                'fees': fees,
                'total': net_proceeds,
                'realizedPnL': realized_pnl,
            }
            self.portfolio['trades'].insert(0, trade_record)

        self.portfolio['holdingsValue'] = round(sum(h['currentValue'] for h in self.portfolio['holdings']), 2)
        self.portfolio['totalEquity'] = round(self.portfolio['cashBalance'] + self.portfolio['holdingsValue'], 2)
        self.portfolio['lastUpdated'] = timestamp

        return {
            'success': True,
            'message': f"Simulated {side} order executed for {quantity} shares of {symbol} at ₹{price:.2f}.",
            'portfolio': self.get_portfolio(),
        }


global_paper_portfolio = InMemoryPaperPortfolioManager(500000)

