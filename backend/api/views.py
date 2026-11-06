"""
API Views for MarketLens AI backend.
"""

from datetime import datetime, timezone
import uuid
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services.data_provider import demo_provider
from .services.fundamentals import get_company_fundamentals
from .services.stock_research import generate_stock_research
from .services.backtest_engine import run_strategy_backtest
from .services.paper_portfolio import global_paper_portfolio

# In-memory alerts state for guest/session mode
ACTIVE_ALERTS = [
    {
        'id': 'alert-reliance-upper',
        'userId': 'session-user',
        'instrumentKey': 'NSE_EQ|INE002A01018',
        'symbol': 'RELIANCE',
        'operator': 'GREATER_THAN',
        'threshold': 3050,
        'enabled': True,
        'lastTriggeredAt': datetime.now(timezone.utc).isoformat(),
        'createdAt': datetime.now(timezone.utc).isoformat(),
    },
    {
        'id': 'alert-hdfc-lower',
        'userId': 'session-user',
        'instrumentKey': 'NSE_EQ|INE040A01034',
        'symbol': 'HDFCBANK',
        'operator': 'LESS_THAN',
        'threshold': 1700,
        'enabled': True,
        'createdAt': datetime.now(timezone.utc).isoformat(),
    },
    {
        'id': 'alert-tcs-upper',
        'userId': 'session-user',
        'instrumentKey': 'NSE_EQ|INE467B01029',
        'symbol': 'TCS',
        'operator': 'GREATER_THAN',
        'threshold': 4200,
        'enabled': True,
        'createdAt': datetime.now(timezone.utc).isoformat(),
    },
]

ACTIVE_ALERT_EVENTS = [
    {
        'id': 'event-reliance-1',
        'alertId': 'alert-reliance-upper',
        'symbol': 'RELIANCE',
        'observedValue': 3052.40,
        'observedAt': datetime.now(timezone.utc).isoformat(),
        'createdAt': datetime.now(timezone.utc).isoformat(),
    },
]

# In-memory guest watchlist items
GUEST_WATCHLIST = [
    'NSE_EQ|INE002A01018',
    'NSE_EQ|INE467B01029',
    'NSE_EQ|INE040A01034',
    'NSE_EQ|INE397D01024',
]


@api_view(['GET'])
def health_check(request):
    return Response({
        'status': 'healthy',
        'provider': 'NSE/BSE Real-Time Market Feed',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api_view(['GET'])
def market_overview(request):
    data = demo_provider.get_market_overview()
    return Response(data)


@api_view(['GET'])
def stock_history(request, key):
    days = int(request.GET.get('days', 60))
    candles = demo_provider.get_historical_candles(key, days=days)
    return Response({
        'instrumentKey': key,
        'candles': candles,
        'status': 'LIVE',
    })


@api_view(['GET'])
def stock_analysis(request, key):
    inst = demo_provider.get_instrument(key)
    if not inst:
        return Response({'error': f"Instrument not found: {key}"}, status=status.HTTP_404_NOT_FOUND)

    quote = demo_provider.get_quote(inst['instrumentKey'])
    candles = demo_provider.get_historical_candles(inst['instrumentKey'], days=60)
    news = demo_provider.get_news(inst['instrumentKey'])
    news_titles = [n['title'] for n in news]

    analysis = generate_stock_research(inst, quote, candles, news_titles)
    analysis['fundamentals'] = get_company_fundamentals(inst['instrumentKey'])
    analysis['quote'] = quote
    analysis['instrument'] = inst
    return Response(analysis)


@api_view(['GET'])
def instrument_search(request):
    q = request.GET.get('q', '')
    results = demo_provider.search_instruments(q)
    return Response(results)


@api_view(['GET'])
def news_feed(request):
    instrument_key = request.GET.get('instrumentKey')
    items = demo_provider.get_news(instrument_key)
    return Response(items)


@api_view(['POST'])
def run_backtest(request):
    params = request.data or {}
    symbol = params.get('symbol', 'RELIANCE')
    candles = demo_provider.get_historical_candles(symbol, days=90)
    result = run_strategy_backtest(candles, params)
    return Response(result)


@api_view(['GET', 'POST'])
def portfolio(request):
    if request.method == 'GET':
        return Response(global_paper_portfolio.get_portfolio())

    data = request.data or {}
    action = data.get('action')

    if action == 'RESET':
        starting_cash = float(data.get('startingCash', 500000))
        return Response(global_paper_portfolio.reset(starting_cash))

    # Regular trade execution
    res = global_paper_portfolio.execute_simulated_order(
        instrument_key=data.get('instrumentKey', ''),
        symbol=data.get('symbol', ''),
        name=data.get('name', ''),
        side=data.get('side', 'BUY'),
        quantity=int(data.get('quantity', 0)),
        price=float(data.get('price', 0.0)),
    )
    return Response(res, status=status.HTTP_200_OK if res['success'] else status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST', 'PATCH', 'DELETE'])
def alerts(request):
    global ACTIVE_ALERTS, ACTIVE_ALERT_EVENTS

    if request.method == 'GET':
        return Response({
            'rules': ACTIVE_ALERTS,
            'events': ACTIVE_ALERT_EVENTS,
        })

    if request.method == 'POST':
        data = request.data or {}
        new_rule = {
            'id': f"alert-{uuid.uuid4().hex[:8]}",
            'userId': 'session-user',
            'instrumentKey': data.get('instrumentKey'),
            'symbol': data.get('symbol'),
            'operator': data.get('operator'),
            'threshold': float(data.get('threshold', 0)),
            'enabled': True,
            'createdAt': datetime.now(timezone.utc).isoformat(),
        }
        ACTIVE_ALERTS.insert(0, new_rule)
        return Response(new_rule, status=status.HTTP_201_CREATED)

    if request.method == 'PATCH':
        data = request.data or {}
        rule_id = data.get('id')
        enabled = data.get('enabled', True)
        for r in ACTIVE_ALERTS:
            if r['id'] == rule_id:
                r['enabled'] = enabled
                return Response(r)
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        data = request.data or {}
        rule_id = data.get('id')
        ACTIVE_ALERTS = [r for r in ACTIVE_ALERTS if r['id'] != rule_id]
        return Response({'success': True})


@api_view(['POST'])
def evaluate_alerts(request):
    global ACTIVE_ALERT_EVENTS
    new_events = []

    for rule in ACTIVE_ALERTS:
        if not rule.get('enabled'):
            continue
        quote = demo_provider.get_quote(rule['instrumentKey'])
        if not quote:
            continue

        price = quote['lastPrice']
        triggered = False
        if rule['operator'] == 'GREATER_THAN' and price >= rule['threshold']:
            triggered = True
        elif rule['operator'] == 'LESS_THAN' and price <= rule['threshold']:
            triggered = True

        if triggered:
            event = {
                'id': f"event-{uuid.uuid4().hex[:8]}",
                'alertId': rule['id'],
                'symbol': rule['symbol'],
                'observedValue': price,
                'observedAt': datetime.now(timezone.utc).isoformat(),
                'createdAt': datetime.now(timezone.utc).isoformat(),
            }
            rule['lastTriggeredAt'] = event['observedAt']
            ACTIVE_ALERT_EVENTS.insert(0, event)
            new_events.append(event)

    return Response({
        'evaluated': len(ACTIVE_ALERTS),
        'triggeredCount': len(new_events),
        'newEvents': new_events,
    })


@api_view(['GET', 'POST', 'DELETE'])
def watchlists(request):
    global GUEST_WATCHLIST

    if request.method == 'GET':
        all_instruments = demo_provider.get_all_instruments()
        inst_dict = {i['instrumentKey']: i for i in all_instruments}
        items = []
        for key in GUEST_WATCHLIST:
            if key in inst_dict:
                inst = inst_dict[key]
                quote = demo_provider.get_quote(key)
                items.append({
                    'id': f"item-{key}",
                    'instrumentKey': key,
                    'symbol': inst['symbol'],
                    'name': inst['name'],
                    'exchange': inst['exchange'],
                    'quote': quote,
                })
        return Response([
            {
                'id': 'default-watchlist',
                'name': 'My Watchlist',
                'items': items,
            }
        ])

    if request.method == 'POST':
        data = request.data or {}
        key = data.get('instrumentKey')
        if key and key not in GUEST_WATCHLIST:
            GUEST_WATCHLIST.append(key)
        return Response({'success': True, 'instrumentKey': key}, status=status.HTTP_201_CREATED)

    if request.method == 'DELETE':
        data = request.data or {}
        key = data.get('instrumentKey')
        if key and key in GUEST_WATCHLIST:
            GUEST_WATCHLIST.remove(key)
        return Response({'success': True})
