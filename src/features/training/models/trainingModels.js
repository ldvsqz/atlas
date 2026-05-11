import dayjs from 'dayjs';

export const CYCLE_TYPES = {
  MACRO: 'macro',
  MESO: 'meso',
  MICRO: 'micro',
};

export const CYCLE_LABELS = {
  [CYCLE_TYPES.MACRO]: 'Macrociclo',
  [CYCLE_TYPES.MESO]: 'Mesociclo',
  [CYCLE_TYPES.MICRO]: 'Microciclo',
};

export const CYCLE_TABS = [
  { value: CYCLE_TYPES.MACRO, label: 'Macrociclos' },
  { value: CYCLE_TYPES.MESO, label: 'Mesociclos' },
  { value: CYCLE_TYPES.MICRO, label: 'Microciclos' },
];

export const EXERCISE_CATEGORIES = [
  'Fuerza',
  'Hipertrofia',
  'Potencia',
  'Cardio',
  'Movilidad',
  'Core',
  'Técnica',
  'Recuperación',
];

export const INTENSITY_LEVELS = ['Baja', 'Media', 'Alta', 'Máxima'];

export const EQUIPMENT_OPTIONS = [
  'Peso corporal',
  'Barra',
  'Mancuernas',
  'Kettlebell',
  'Máquina',
  'Banda',
  'Polea',
  'Cardio',
  'Otro',
];

export const EDITABLE_DAY_BLOCK_KEYS = ['mainBlock', 'extraBlock'];

export const TRAINING_WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const DAY_FLOW_STEPS = [
  {
    key: 'warmupBlock',
    label: 'Calentamiento',
    description: 'Ejercicio fijo de calentamiento',
    persisted: false,
  },
  {
    key: 'shadowBlock',
    label: 'Sombra',
    description: 'Ejercicio fijo de sombra',
    persisted: false,
  }
];

export const BLOCK_LABELS = {
  warmupBlock: 'Calentamiento',
  shadowBlock: 'Sombra',
  mainBlock: 'Bloque principal',
  extraBlock: 'Extra',
};

export const createEmptyBlock = () => ({
  notes: '',
  exerciseIds: [],
});

export const createDefaultCycleDays = (weeks = 1) =>
  Array.from({ length: Math.max(Number(weeks) || 1, 1) }, (_, weekIndex) =>
    Array.from({ length: 5 }, (_, dayIndex) => {
      const sequentialDay = (weekIndex * 5) + dayIndex + 1;

      return {
        weekIndex: weekIndex + 1,
        dayOfWeek: dayIndex + 1,
        dayIndex: sequentialDay,
        name: TRAINING_WEEK_DAYS[dayIndex],
        mainBlock: createEmptyBlock(),
        shadowBlock: createEmptyBlock(),
        extraBlock: createEmptyBlock(),
        createdAt: null,
        updatedAt: null,
      };
    })
  ).flat();

export const createDefaultMicrocycleDays = () => createDefaultCycleDays(1);

export const getCycleDayDocId = (day) =>
  `w${day.weekIndex || 1}-d${day.dayOfWeek || day.dayIndex || 1}`;

export const normalizeCycleDay = (day) => {
  const legacyDayIndex = Number(day.dayIndex || 1);
  const weekIndex = Number(day.weekIndex || Math.ceil(legacyDayIndex / 5) || 1);
  const dayOfWeek = Number(day.dayOfWeek || (((legacyDayIndex - 1) % 5) + 1) || 1);

  return {
    ...day,
    weekIndex,
    dayOfWeek,
    dayIndex: legacyDayIndex,
    name: day.name || TRAINING_WEEK_DAYS[dayOfWeek - 1] || `Día ${dayOfWeek}`,
    mainBlock: createEmptyBlock(),
    ...('mainBlock' in day ? { mainBlock: { ...createEmptyBlock(), ...day.mainBlock } } : {}),
    shadowBlock: createEmptyBlock(),
    ...('shadowBlock' in day ? { shadowBlock: { ...createEmptyBlock(), ...day.shadowBlock } } : {}),
    extraBlock: createEmptyBlock(),
    ...('extraBlock' in day ? { extraBlock: { ...createEmptyBlock(), ...day.extraBlock } } : {}),
  };
};

export const createCycleModel = ({
  name = '',
  type = CYCLE_TYPES.MESO,
  description = '',
  weeks = 4,
  parentCycleId = '',
  public: isPublic = true,
  startsAt = null,
} = {}) => ({
  id: '',
  name,
  type,
  description,
  weeks: Number(weeks),
  parentCycleId,
  public: isPublic,
  startsAt,
  createdAt: null,
  updatedAt: null,
});

export const createExerciseModel = ({
  name = '',
  category = '',
  description = '',
  intensity = '',
  equipment = '',
} = {}) => ({
  id: '',
  name,
  category,
  description,
  intensity,
  equipment,
  createdAt: null,
  updatedAt: null,
});

export const validateCycleWeeks = (type, weeks) => {
  const parsedWeeks = Number(weeks);

  if (!Number.isFinite(parsedWeeks) || parsedWeeks < 1) {
    return 'La duración debe ser de al menos 1 semana.';
  }

  if (type === CYCLE_TYPES.MACRO && parsedWeeks < 12) {
    return 'Un macrociclo debe durar 12 semanas o más.';
  }

  if (type === CYCLE_TYPES.MESO && parsedWeeks >= 12) {
    return 'Un mesociclo debe durar menos de 12 semanas.';
  }

  if (type === CYCLE_TYPES.MICRO && parsedWeeks !== 1) {
    return 'Un microciclo debe durar exactamente 1 semana.';
  }

  return true;
};

export const normalizeFirestoreDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return dayjs(value.toDate());
  if (value instanceof Date) return dayjs(value);
  return dayjs(value);
};
