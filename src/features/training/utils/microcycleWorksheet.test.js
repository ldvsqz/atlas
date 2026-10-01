import { describe, expect, it } from 'vitest';
import {
  formatTrainingTotal,
  formatTrainingLoadInput,
  getMicrocycleDayTotals,
  getMicrocycleTotal,
  MICROCYCLE_DAY_COUNT,
  parseTrainingLoad,
} from './microcycleWorksheet';
import { createDefaultCycleDays, TRAINING_WEEK_DAYS } from '../models/trainingModels';
import { getMicrocycleDate } from '../public/publicCycleUtils';

describe('microcycle worksheet load parsing', () => {
  it('adds interval notation as the user types shorthand', () => {
    expect(formatTrainingLoadInput('4x3x1')).toBe("4x3'x1");
    expect(formatTrainingLoadInput('4x3x1', true)).toBe("4x3'x1'");
    expect(formatTrainingLoadInput("4x3'x1'")).toBe("4x3'x1'");
    expect(formatTrainingLoadInput('10')).toBe('10');
  });

  it('calculates round-based work and rest durations', () => {
    expect(parseTrainingLoad("3x3'x1'")).toEqual({ kind: 'duration', minutes: 12 });
    expect(parseTrainingLoad("3x1.5'x1'")).toEqual({ kind: 'duration', minutes: 7.5 });
    expect(parseTrainingLoad("5x1.5'x1'")).toEqual({ kind: 'duration', minutes: 12.5 });
  });

  it('parses single durations, seconds, and distances', () => {
    expect(parseTrainingLoad("10'")).toEqual({ kind: 'duration', minutes: 10 });
    expect(parseTrainingLoad('90s')).toEqual({ kind: 'duration', minutes: 1.5 });
    expect(parseTrainingLoad('6km')).toEqual({ kind: 'distance', meters: 6000 });
  });

  it('totals time and distance separately for each weekday', () => {
    const rows = [
      { cells: { 1: "3x3'x1'" } },
      { cells: { 1: '6km', 2: "5x1.5'x1'" } },
    ];
    const totals = getMicrocycleDayTotals(rows);

    expect(totals[0]).toEqual({ minutes: 12, meters: 6000, invalid: 0 });
    expect(formatTrainingTotal(totals[0])).toBe('12 min · 6 km');
    expect(totals[1]).toEqual({ minutes: 12.5, meters: 0, invalid: 0 });
  });

  it('calculates a combined microcycle total for the printed worksheet', () => {
    const rows = [
      { cells: { 1: "3x3'x1'" } },
      { cells: { 2: "3x1.5'x1'", 3: '6km' } },
    ];

    expect(getMicrocycleTotal(rows)).toEqual({ minutes: 19.5, meters: 6000, invalid: 0 });
  });

  it('assigns each microcycle its date relative to the cycle start', () => {
    const date = getMicrocycleDate({ startsAt: '2026-09-01', createdAt: '2026-08-30' }, 3);

    expect(date.format('DD/MM/YYYY')).toBe('15/09/2026');
  });

  it('marks unsupported input and creates six days per microcycle', () => {
    expect(parseTrainingLoad('intenso')).toEqual({ kind: 'invalid' });
    expect(MICROCYCLE_DAY_COUNT).toBe(6);
    expect(TRAINING_WEEK_DAYS).toHaveLength(6);
    expect(createDefaultCycleDays(1)).toHaveLength(6);
  });
});
