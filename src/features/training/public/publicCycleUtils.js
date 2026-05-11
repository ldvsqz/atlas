import { BLOCK_LABELS } from '../models/trainingModels';

export const PUBLIC_CYCLE_ROUTE_PREFIX = '/public/cycle';

export const getPublicCyclePath = (cycleId) => `${PUBLIC_CYCLE_ROUTE_PREFIX}/${cycleId}`;

export const getPublicCycleUrl = (cycleId) =>
  `${window.location.origin}${getPublicCyclePath(cycleId)}`;

export const groupDaysByWeek = (days = []) =>
  days.reduce((groups, day) => {
    const weekIndex = Number(day.weekIndex || 1);
    return {
      ...groups,
      [weekIndex]: [...(groups[weekIndex] || []), day].sort(
        (a, b) => Number(a.dayOfWeek || 0) - Number(b.dayOfWeek || 0)
      ),
    };
  }, {});

export const collectExerciseIdsFromDays = (days = []) =>
  days.flatMap((day) =>
    ['shadowBlock', 'mainBlock', 'extraBlock'].flatMap((blockKey) =>
      day[blockKey]?.exerciseIds || []
    )
  );

export const createExerciseMap = (exercises = []) =>
  new Map(exercises.map((exercise) => [String(exercise.id), exercise]));

export const getExerciseValue = (exercise, keys, fallback = '-') => {
  const value = keys.map((key) => exercise?.[key]).find((item) => item !== undefined && item !== null && item !== '');
  return value || fallback;
};

export const getBlockTitle = (blockKey) => BLOCK_LABELS[blockKey] || blockKey;

