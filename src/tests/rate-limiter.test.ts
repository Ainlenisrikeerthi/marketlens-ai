import { describe, it, expect, beforeEach } from 'vitest';
import { globalRateLimiter } from '../lib/rate-limiter';

describe('MemoryRateLimiter Specification', () => {
  beforeEach(() => {
    globalRateLimiter.reset();
  });

  it('should allow requests within limit', () => {
    const res1 = globalRateLimiter.check('test-ip-1', 5, 10_000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = globalRateLimiter.check('test-ip-1', 5, 10_000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it('should block requests exceeding the limit', () => {
    for (let i = 0; i < 3; i++) {
      const res = globalRateLimiter.check('test-ip-2', 3, 10_000);
      expect(res.success).toBe(true);
    }

    const blocked = globalRateLimiter.check('test-ip-2', 3, 10_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(0);
  });

  it('should isolate limits between different IP keys', () => {
    for (let i = 0; i < 2; i++) {
      globalRateLimiter.check('ip-a', 2, 10_000);
    }
    const blockedA = globalRateLimiter.check('ip-a', 2, 10_000);
    expect(blockedA.success).toBe(false);

    // ip-b should still have full quota
    const allowedB = globalRateLimiter.check('ip-b', 2, 10_000);
    expect(allowedB.success).toBe(true);
    expect(allowedB.remaining).toBe(1);
  });
});
