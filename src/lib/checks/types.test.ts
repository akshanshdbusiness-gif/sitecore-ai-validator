import { describe, expect, it } from 'vitest';
import { statusRank, worstStatus } from './types';

describe('statusRank', () => {
  it('orders fail > warn > pass > skipped', () => {
    expect(statusRank('fail')).toBeGreaterThan(statusRank('warn'));
    expect(statusRank('warn')).toBeGreaterThan(statusRank('pass'));
    expect(statusRank('pass')).toBeGreaterThan(statusRank('skipped'));
  });
});

describe('worstStatus', () => {
  it('returns skipped for an empty list', () => {
    expect(worstStatus([])).toBe('skipped');
  });

  it('returns skipped when every status is skipped', () => {
    expect(worstStatus(['skipped', 'skipped'])).toBe('skipped');
  });

  it('picks the single worst status regardless of order', () => {
    expect(worstStatus(['pass', 'warn', 'skipped'])).toBe('warn');
    expect(worstStatus(['fail', 'pass', 'warn'])).toBe('fail');
    expect(worstStatus(['skipped', 'fail'])).toBe('fail');
  });

  it('does not let a fail be masked by surrounding passes', () => {
    expect(worstStatus(['pass', 'pass', 'fail', 'pass'])).toBe('fail');
  });
});
