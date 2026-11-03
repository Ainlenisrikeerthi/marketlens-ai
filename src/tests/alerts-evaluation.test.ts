import { describe, it, expect } from 'vitest';
import { AlertRule } from '../types/market';

function evaluateAlertRule(alert: AlertRule, currentPrice: number): boolean {
  if (!alert.enabled) return false;
  if (alert.operator === 'GREATER_THAN') {
    return currentPrice >= alert.threshold;
  }
  if (alert.operator === 'LESS_THAN') {
    return currentPrice <= alert.threshold;
  }
  return false;
}

describe('Alert Evaluation Logic', () => {
  const baseAlert: AlertRule = {
    id: 'test-1',
    userId: 'u-1',
    instrumentKey: 'NSE_EQ|INE002A01018',
    symbol: 'RELIANCE',
    operator: 'GREATER_THAN',
    threshold: 3000,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  it('triggers GREATER_THAN when currentPrice >= threshold', () => {
    expect(evaluateAlertRule(baseAlert, 3050)).toBe(true);
    expect(evaluateAlertRule(baseAlert, 3000)).toBe(true);
    expect(evaluateAlertRule(baseAlert, 2999.95)).toBe(false);
  });

  it('triggers LESS_THAN when currentPrice <= threshold', () => {
    const dropAlert: AlertRule = {
      ...baseAlert,
      operator: 'LESS_THAN',
      threshold: 2800,
    };

    expect(evaluateAlertRule(dropAlert, 2750)).toBe(true);
    expect(evaluateAlertRule(dropAlert, 2800)).toBe(true);
    expect(evaluateAlertRule(dropAlert, 2850)).toBe(false);
  });

  it('never triggers when alert is disabled', () => {
    const disabledAlert: AlertRule = {
      ...baseAlert,
      enabled: false,
      threshold: 3000,
    };

    expect(evaluateAlertRule(disabledAlert, 3500)).toBe(false);
  });
});
