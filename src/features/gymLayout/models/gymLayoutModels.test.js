import { describe, expect, it } from 'vitest';
import { formatGymLayoutName } from './gymLayoutModels';

describe('formatGymLayoutName', () => {
  it('formats a Spanish weekday and date using the circuit naming convention', () => {
    expect(formatGymLayoutName(new Date(2026, 7, 17, 12))).toBe('C-lun.17.ago.2026');
  });

  it('formats single-digit days without a leading zero', () => {
    expect(formatGymLayoutName(new Date(2026, 0, 2, 12))).toBe('C-vie.2.ene.2026');
  });
});
