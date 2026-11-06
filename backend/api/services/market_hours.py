"""
Indian market hours logic.
Port of market-hours.ts — getIndianMarketSession() and determineDataStatus().
"""

from datetime import datetime, timezone, timedelta

IST_OFFSET = timedelta(hours=5, minutes=30)
IST_TZ = timezone(IST_OFFSET)


def get_indian_market_session(current_time=None):
    """
    Returns market session info for Indian equity markets (NSE/BSE).
    Normal Trading Hours: Monday-Friday, 09:15 to 15:30 IST.
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)

    # Convert to IST
    ist_date = current_time.astimezone(IST_TZ)

    day_of_week = ist_date.weekday()  # 0=Monday, 6=Sunday
    hours = ist_date.hour
    minutes = ist_date.minute
    time_in_minutes = hours * 60 + minutes

    is_weekend = day_of_week >= 5  # Saturday=5, Sunday=6

    # Format IST time string
    ist_time_string = ist_date.strftime('%Y-%m-%dT%H:%M:%S') + '+05:30'

    if is_weekend:
        return {
            'isOpen': False,
            'sessionState': 'WEEKEND',
            'istTimeString': ist_time_string,
            'recommendedStatus': 'CLOSED',
        }

    # Regular market session: 09:15 (555 min) to 15:30 (930 min)
    market_open_minutes = 9 * 60 + 15   # 555
    market_close_minutes = 15 * 60 + 30  # 930
    pre_open_minutes = 9 * 60            # 540

    if time_in_minutes < pre_open_minutes:
        return {
            'isOpen': False,
            'sessionState': 'PRE_OPEN',
            'istTimeString': ist_time_string,
            'recommendedStatus': 'CLOSED',
        }
    elif time_in_minutes < market_open_minutes:
        return {
            'isOpen': False,
            'sessionState': 'PRE_OPEN',
            'istTimeString': ist_time_string,
            'recommendedStatus': 'DELAYED',
        }
    elif time_in_minutes <= market_close_minutes:
        return {
            'isOpen': True,
            'sessionState': 'REGULAR',
            'istTimeString': ist_time_string,
            'recommendedStatus': 'LIVE',
        }
    else:
        return {
            'isOpen': False,
            'sessionState': 'POST_CLOSE',
            'istTimeString': ist_time_string,
            'recommendedStatus': 'CLOSED',
        }


def determine_data_status(quote_timestamp, is_demo_fixture=False):
    """
    Determine data freshness status based on market hours and quote timestamp.
    """
    if is_demo_fixture:
        return 'DEMO'

    session = get_indian_market_session()

    if not session['isOpen']:
        return 'CLOSED'

    # During market hours, check freshness
    if isinstance(quote_timestamp, str):
        quote_date = datetime.fromisoformat(quote_timestamp.replace('Z', '+00:00'))
    else:
        quote_date = quote_timestamp

    now = datetime.now(timezone.utc)
    diff_minutes = (now - quote_date).total_seconds() / 60

    if diff_minutes > 30:
        return 'STALE'
    elif diff_minutes > 15:
        return 'DELAYED'

    return 'LIVE'
