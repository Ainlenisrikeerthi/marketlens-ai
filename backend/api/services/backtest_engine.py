"""
Deterministic Backtest Engine strictly preventing look-ahead bias.
Port of backtest-engine.ts.
"""

from .indicators import calculate_sma, calculate_rsi


def run_strategy_backtest(candles, parameters):
    starting_capital = float(parameters.get('startingCapital') or 500000)
    fee_percent = float(parameters.get('estimatedFeePercent') if parameters.get('estimatedFeePercent') is not None else 0.1) / 100.0
    slippage_percent = float(parameters.get('estimatedSlippagePercent') if parameters.get('estimatedSlippagePercent') is not None else 0.05) / 100.0
    position_size_percent = float(parameters.get('positionSizePercent') if parameters.get('positionSizePercent') is not None else 100.0) / 100.0
    strategy = parameters.get('strategy', 'SMA_CROSSOVER')
    symbol = parameters.get('symbol', 'RELIANCE')

    warnings = [
        'SIMULATED — NOT LIVE TRADING',
        'Simulated results incorporate next-bar execution modeling, fee deductions, and slippage.',
        'Past simulated performance does not guarantee future live returns in Indian equity markets.',
    ]

    if not candles or len(candles) < 25:
        return {
            'parameters': parameters,
            'trades': [],
            'equityCurve': [],
            'metrics': {
                'totalReturnPercent': 0,
                'benchmarkReturnPercent': 0,
                'totalTrades': 0,
                'winningTrades': 0,
                'losingTrades': 0,
                'winRatePercent': 0,
                'maxDrawdownPercent': 0,
                'finalEquity': starting_capital,
            },
            'benchmark': {
                'symbol': symbol,
                'buyAndHoldFinalEquity': starting_capital,
                'totalReturnPercent': 0,
            },
            'warnings': ['Insufficient historical bars to compute indicator warmup period (minimum 25 bars required).'],
            'status': 'LIVE',
        }

    cash = starting_capital
    shares = 0
    peak_equity = starting_capital
    max_drawdown = 0.0

    trades = []
    equity_curve = []

    closes = [c['close'] for c in candles]
    benchmark_start_price = candles[0]['close']
    benchmark_units = starting_capital / benchmark_start_price if benchmark_start_price > 0 else 0

    pending_signal = None
    pending_reason = ''

    warmup_bars = max(int(parameters.get('smaSlow') or 20), 20) if strategy == 'SMA_CROSSOVER' else 16

    for i in range(len(candles)):
        current_bar = candles[i]

        # 1. EXECUTE PENDING SIGNAL from yesterday's bar close at today's open price
        if pending_signal == 'BUY' and cash > 1000:
            fill_price = round(current_bar['open'] * (1 + slippage_percent), 2)
            target_allocation = starting_capital * position_size_percent
            deployable_cash = min(cash, target_allocation)
            qty = int(deployable_cash // fill_price)

            if qty > 0:
                principal = qty * fill_price
                fee = round(principal * fee_percent, 2)
                total_outlay = principal + fee

                if cash >= total_outlay:
                    cash = round(cash - total_outlay, 2)
                    shares += qty

                    trades.append({
                        'id': f"trade-{len(trades) + 1}",
                        'date': current_bar['timestamp'],
                        'symbol': symbol,
                        'side': 'BUY',
                        'quantity': qty,
                        'price': fill_price,
                        'fees': fee,
                        'reason': pending_reason,
                    })
            pending_signal = None

        elif pending_signal == 'SELL' and shares > 0:
            fill_price = round(current_bar['open'] * (1 - slippage_percent), 2)
            gross_revenue = shares * fill_price
            fee = round(gross_revenue * fee_percent, 2)
            net_revenue = round(gross_revenue - fee, 2)

            # Calculate Net PnL based on previous buy trade
            last_buy = next((t for t in reversed(trades) if t['side'] == 'BUY'), None)
            cost_basis = (last_buy['price'] * shares + last_buy['fees']) if last_buy else 0
            net_pnl = round(net_revenue - cost_basis, 2)

            cash = round(cash + net_revenue, 2)

            trades.append({
                'id': f"trade-{len(trades) + 1}",
                'date': current_bar['timestamp'],
                'symbol': symbol,
                'side': 'SELL',
                'quantity': shares,
                'price': fill_price,
                'fees': fee,
                'netPnl': net_pnl,
                'reason': pending_reason,
            })

            shares = 0
            pending_signal = None

        # 2. MARK-TO-MARKET PORTFOLIO VALUE AT CLOSE OF CURRENT BAR
        current_holdings_value = shares * current_bar['close']
        current_total_equity = round(cash + current_holdings_value, 2)
        benchmark_equity = round(benchmark_units * current_bar['close'], 2)

        if current_total_equity > peak_equity:
            peak_equity = current_total_equity
        current_drawdown = round(((peak_equity - current_total_equity) / peak_equity) * 100, 2) if peak_equity > 0 else 0.0

        if current_drawdown > max_drawdown:
            max_drawdown = current_drawdown

        equity_curve.append({
            'date': current_bar['timestamp'],
            'equity': current_total_equity,
            'benchmarkEquity': benchmark_equity,
        })

        # 3. EVALUATE STRATEGY SIGNALS AT CLOSE OF BAR
        if i >= warmup_bars and i < len(candles) - 1:
            historical_slice = closes[:i + 1]

            if strategy == 'SMA_CROSSOVER':
                fast_p = int(parameters.get('smaFast') or 10)
                slow_p = int(parameters.get('smaSlow') or 20)

                fast_sma = calculate_sma(historical_slice, fast_p)
                slow_sma = calculate_sma(historical_slice, slow_p)

                if fast_sma is not None and slow_sma is not None:
                    if fast_sma > slow_sma and shares == 0:
                        pending_signal = 'BUY'
                        pending_reason = f"SMA({fast_p}) crossed above SMA({slow_p}) [₹{fast_sma} > ₹{slow_sma}]"
                    elif fast_sma < slow_sma and shares > 0:
                        pending_signal = 'SELL'
                        pending_reason = f"SMA({fast_p}) crossed below SMA({slow_p}) [₹{fast_sma} < ₹{slow_sma}]"
            else:
                oversold = float(parameters.get('rsiOversold') or 35)
                overbought = float(parameters.get('rsiOverbought') or 65)
                rsi = calculate_rsi(historical_slice, 14)

                if rsi is not None:
                    if rsi <= oversold and shares == 0:
                        pending_signal = 'BUY'
                        pending_reason = f"14-day RSI oversold trigger ({rsi} ≤ {oversold})"
                    elif rsi >= overbought and shares > 0:
                        pending_signal = 'SELL'
                        pending_reason = f"14-day RSI overbought trigger ({rsi} ≥ {overbought})"

    final_equity = equity_curve[-1]['equity'] if equity_curve else starting_capital
    total_return = round(final_equity - starting_capital, 2)
    total_return_percent = round((total_return / starting_capital) * 100, 2)

    closed_trades = [t for t in trades if t['side'] == 'SELL']
    winning_trades = len([t for t in closed_trades if (t.get('netPnl') or 0) > 0])
    losing_trades = len([t for t in closed_trades if (t.get('netPnl') or 0) <= 0])
    win_rate_percent = round((winning_trades / len(closed_trades)) * 100, 1) if closed_trades else 0.0

    benchmark_final_equity = equity_curve[-1]['benchmarkEquity'] if equity_curve else starting_capital
    benchmark_return_percent = round(((benchmark_final_equity - starting_capital) / starting_capital) * 100, 2)

    return {
        'parameters': parameters,
        'trades': trades,
        'equityCurve': equity_curve,
        'metrics': {
            'totalReturnPercent': total_return_percent,
            'benchmarkReturnPercent': benchmark_return_percent,
            'totalTrades': len(trades),
            'winningTrades': winning_trades,
            'losingTrades': losing_trades,
            'winRatePercent': win_rate_percent,
            'maxDrawdownPercent': round(max_drawdown, 2),
            'finalEquity': final_equity,
        },
        'benchmark': {
            'symbol': symbol,
            'totalReturnPercent': benchmark_return_percent,
            'buyAndHoldFinalEquity': benchmark_final_equity,
        },
        'warnings': warnings,
        'status': 'LIVE',
    }
