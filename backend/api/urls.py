from django.urls import path
from . import views

urlpatterns = [
    path('market/overview/', views.market_overview, name='market_overview'),
    path('stocks/<path:key>/history/', views.stock_history, name='stock_history'),
    path('stocks/<path:key>/analysis/', views.stock_analysis, name='stock_analysis'),
    path('instruments/search/', views.instrument_search, name='instrument_search'),
    path('news/', views.news_feed, name='news_feed'),
    path('backtests/', views.run_backtest, name='run_backtest'),
    path('portfolio/', views.portfolio, name='portfolio'),
    path('alerts/', views.alerts, name='alerts'),
    path('alerts/evaluate/', views.evaluate_alerts, name='evaluate_alerts'),
    path('watchlists/', views.watchlists, name='watchlists'),
    path('health/', views.health_check, name='health_check'),
]
