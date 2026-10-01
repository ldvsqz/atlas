import { MAIN_CIRCUIT_STATION_COUNT } from './mainCircuitBuilder.js';
import { MICROCYCLE_DAY_COUNT } from './microcycleWorksheet.js';

export const LOAD_INTENSITY_OPTIONS = ['Baja', 'Media', 'Alta', 'Máxima'];
export const LOAD_VOLUME_OPTIONS = ['Bajo', 'Medio', 'Alto'];

export const LOAD_FALLBACK_CATEGORIES = [
  'Técnica',
  'Escuela de combate',
  'Coordinación',
  'Acondicionamiento',
  'Potencia y pliometría',
  'Reacción',
];

export const getSessionLoadKey = (weekIndex, dayOfWeek) => `w${weekIndex}-d${dayOfWeek}`;

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getCategoryOptions = (categoryOptions = []) => (
  categoryOptions.length ? categoryOptions : LOAD_FALLBACK_CATEGORIES
);

const findAvailableCategory = (category, categoryOptions = []) => {
  const options = getCategoryOptions(categoryOptions);
  const normalizedCategory = normalizeText(category);
  return options.find((option) => normalizeText(option) === normalizedCategory) || '';
};

const pickFirstAvailableCategory = (preferredCategories = [], categoryOptions = []) => {
  const options = getCategoryOptions(categoryOptions);

  for (const category of preferredCategories) {
    const match = findAvailableCategory(category, options);
    if (match) return match;
  }

  return options[0] || '';
};

export const inferLoadCategoryFromObjective = (objective = '', categoryOptions = []) => {
  const normalizedObjective = normalizeText(objective);

  const categoryHints = [
    {
      category: 'Potencia y pliometría',
      keywords: ['potencia', 'explos', 'salto', 'pliometr', 'velocidad', 'fuerza'],
    },
    {
      category: 'Acondicionamiento',
      keywords: ['resistencia', 'cardio', 'metabol', 'fatiga', 'condicion', 'acondicion'],
    },
    {
      category: 'Escuela de combate',
      keywords: ['combate', 'sparring', 'pelea', 'ring', 'round', 'asalto'],
    },
    {
      category: 'Técnica',
      keywords: ['tecnica', 'golpe', 'guardia', 'boxeo', 'patada', 'forma'],
    },
    {
      category: 'Coordinación',
      keywords: ['coordinacion', 'agilidad', 'ritmo', 'equilibrio', 'footwork'],
    },
    {
      category: 'Reacción',
      keywords: ['reaccion', 'reflejo', 'respuesta', 'decision', 'estimulo'],
    },
  ];

  const inferredCategory = categoryHints.find((hint) =>
    hint.keywords.some((keyword) => normalizedObjective.includes(keyword))
  )?.category;

  return pickFirstAvailableCategory([inferredCategory, 'Técnica'], categoryOptions);
};

const getProgressiveIntensity = (weekIndex, weeks) => {
  if (weeks >= 4 && weekIndex === weeks) return 'Baja';
  if (weekIndex === 1) return 'Media';
  if (weekIndex >= Math.ceil(weeks * 0.75)) return 'Alta';
  return 'Media';
};

const getProgressiveVolume = (weekIndex, weeks) => {
  if (weeks >= 4 && weekIndex === weeks) return 'Bajo';
  if (weekIndex >= Math.ceil(weeks * 0.5)) return 'Alto';
  return 'Medio';
};

const getSessionIntensity = (microcycleIntensity, dayOfWeek) => {
  if (dayOfWeek === 5 || dayOfWeek === 6) return microcycleIntensity === 'Máxima' ? 'Alta' : 'Baja';
  if (dayOfWeek === 3 && ['Alta', 'Máxima'].includes(microcycleIntensity)) return 'Máxima';
  if (dayOfWeek === 1 && microcycleIntensity === 'Baja') return 'Media';
  return microcycleIntensity;
};

const getSessionVolume = (microcycleVolume, dayOfWeek) => {
  if (dayOfWeek === 5 || dayOfWeek === 6) return 'Bajo';
  if (dayOfWeek === 2 && microcycleVolume !== 'Bajo') return 'Alto';
  return microcycleVolume;
};

const getSessionCategoryPattern = (focusCategory, dayOfWeek, categoryOptions = []) => {
  const patterns = {
    1: [focusCategory, 'Técnica', 'Coordinación'],
    2: [focusCategory, 'Acondicionamiento', 'Escuela de combate'],
    3: [focusCategory, 'Potencia y pliometría', 'Reacción'],
    4: [focusCategory, 'Escuela de combate', 'Acondicionamiento'],
    5: ['Técnica', 'Coordinación', 'Reacción', focusCategory],
  };

  return pickFirstAvailableCategory(patterns[dayOfWeek] || [focusCategory], categoryOptions);
};

export const createWizardLoadPlan = ({
  objective = '',
  weeks = 1,
  categoryOptions = [],
} = {}) => {
  const weekCount = Math.max(Number(weeks) || 1, 1);
  const objectiveCategory = inferLoadCategoryFromObjective(objective, categoryOptions);
  const categories = getCategoryOptions(categoryOptions);
  const microcycleLoads = Array.from({ length: weekCount }, (_, index) => {
    const weekIndex = index + 1;

    return {
      weekIndex,
      focusCategory: objectiveCategory || categories[index % categories.length] || '',
      intensity: getProgressiveIntensity(weekIndex, weekCount),
      volume: getProgressiveVolume(weekIndex, weekCount),
      notes: '',
    };
  });

  const sessionLoads = microcycleLoads.reduce((loads, microcycleLoad) => {
    for (let dayOfWeek = 1; dayOfWeek <= MICROCYCLE_DAY_COUNT; dayOfWeek += 1) {
      loads[getSessionLoadKey(microcycleLoad.weekIndex, dayOfWeek)] = {
        weekIndex: microcycleLoad.weekIndex,
        dayOfWeek,
        focusCategory: getSessionCategoryPattern(microcycleLoad.focusCategory, dayOfWeek, categories),
        intensity: getSessionIntensity(microcycleLoad.intensity, dayOfWeek),
        volume: getSessionVolume(microcycleLoad.volume, dayOfWeek),
        notes: '',
      };
    }

    return loads;
  }, {});

  return { microcycleLoads, sessionLoads };
};

export const createSessionLoadsFromMicrocycleLoads = ({
  microcycleLoads = [],
  categoryOptions = [],
} = {}) => {
  const categories = getCategoryOptions(categoryOptions);

  return microcycleLoads.reduce((loads, microcycleLoad) => {
    const weekIndex = Number(microcycleLoad.weekIndex || 1);

    for (let dayOfWeek = 1; dayOfWeek <= MICROCYCLE_DAY_COUNT; dayOfWeek += 1) {
      loads[getSessionLoadKey(weekIndex, dayOfWeek)] = {
        weekIndex,
        dayOfWeek,
        focusCategory: getSessionCategoryPattern(microcycleLoad.focusCategory, dayOfWeek, categories),
        intensity: getSessionIntensity(microcycleLoad.intensity, dayOfWeek),
        volume: getSessionVolume(microcycleLoad.volume, dayOfWeek),
        notes: '',
      };
    }

    return loads;
  }, {});
};

export const mergeWizardLoadPlan = (defaults, current, preserveCurrent = false) => {
  if (!preserveCurrent) return defaults;

  const currentMicrocycleLoads = new Map(
    (current.microcycleLoads || []).map((load) => [Number(load.weekIndex), load])
  );

  const microcycleLoads = defaults.microcycleLoads.map((defaultLoad) => ({
    ...defaultLoad,
    ...(currentMicrocycleLoads.get(Number(defaultLoad.weekIndex)) || {}),
  }));

  const sessionLoads = Object.fromEntries(
    Object.entries(defaults.sessionLoads).map(([key, defaultLoad]) => ([
      key,
      {
        ...defaultLoad,
        ...(current.sessionLoads?.[key] || {}),
      },
    ]))
  );

  return { microcycleLoads, sessionLoads };
};

export const normalizeWizardLoadPlan = ({
  objective = '',
  weeks = 1,
  categoryOptions = [],
  microcycleLoads = [],
  sessionLoads = {},
} = {}) => mergeWizardLoadPlan(
  createWizardLoadPlan({ objective, weeks, categoryOptions }),
  { microcycleLoads, sessionLoads },
  true
);

const buildStationCategoryOrder = ({
  objective,
  microcycleLoad,
  sessionLoad,
  categoryOptions = [],
}) => {
  const options = getCategoryOptions(categoryOptions);
  const preferred = [
    sessionLoad.focusCategory,
    microcycleLoad.focusCategory,
    inferLoadCategoryFromObjective(objective, options),
  ];

  if (['Alta', 'Máxima'].includes(sessionLoad.intensity)) {
    preferred.push('Potencia y pliometría', 'Reacción');
  }

  if (sessionLoad.volume === 'Alto') {
    preferred.push('Acondicionamiento', 'Escuela de combate');
  }

  if (sessionLoad.intensity === 'Baja') {
    preferred.push('Técnica', 'Coordinación');
  }

  preferred.push('Técnica', 'Coordinación', 'Acondicionamiento', 'Reacción', 'Escuela de combate');

  const ordered = [];
  preferred.forEach((category) => {
    const match = pickFirstAvailableCategory([category], options);
    if (match && !ordered.includes(match)) ordered.push(match);
  });

  options.forEach((category) => {
    if (!ordered.includes(category)) ordered.push(category);
  });

  while (ordered.length < MAIN_CIRCUIT_STATION_COUNT && options.length) {
    ordered.push(options[ordered.length % options.length]);
  }

  return ordered.slice(0, MAIN_CIRCUIT_STATION_COUNT);
};

export const getWizardDayPlan = ({
  objective = '',
  weekIndex = 1,
  dayOfWeek = 1,
  categoryOptions = [],
  microcycleLoads = [],
  sessionLoads = {},
} = {}) => {
  const normalizedPlan = normalizeWizardLoadPlan({
    objective,
    weeks: Math.max(Number(weekIndex) || 1, 1),
    categoryOptions,
    microcycleLoads,
    sessionLoads,
  });
  const microcycleLoad = normalizedPlan.microcycleLoads.find((load) => Number(load.weekIndex) === Number(weekIndex))
    || normalizedPlan.microcycleLoads[0];
  const sessionLoad = normalizedPlan.sessionLoads[getSessionLoadKey(weekIndex, dayOfWeek)]
    || createWizardLoadPlan({ objective, weeks: 1, categoryOptions }).sessionLoads[getSessionLoadKey(1, dayOfWeek)];

  return {
    microcycleLoad,
    sessionLoad,
    stationCategories: buildStationCategoryOrder({
      objective,
      microcycleLoad,
      sessionLoad,
      categoryOptions,
    }),
  };
};

export const formatLoadSummary = ({
  microcycleLoad,
  sessionLoad,
  objective = '',
  includeMicrocycle = true,
} = {}) => {
  const lines = [
    objective.trim() ? `Objetivo: ${objective.trim()}` : '',
    includeMicrocycle ? `Microciclo ${microcycleLoad.weekIndex}: ${microcycleLoad.focusCategory || 'Sin énfasis'} · Intensidad ${microcycleLoad.intensity} · Volumen ${microcycleLoad.volume}` : '',
    `Sesión ${sessionLoad.dayOfWeek}: ${sessionLoad.focusCategory || 'Sin énfasis'} · Intensidad ${sessionLoad.intensity} · Volumen ${sessionLoad.volume}`,
  ];

  if (includeMicrocycle && microcycleLoad.notes?.trim()) lines.push(`Nota del microciclo: ${microcycleLoad.notes.trim()}`);
  if (sessionLoad.notes?.trim()) lines.push(`Nota de sesión: ${sessionLoad.notes.trim()}`);

  return lines.filter(Boolean).join('\n');
};

export const formatCyclePlanningDescription = ({
  objective = '',
  microcycleLoads = [],
} = {}) => {
  const loadLines = microcycleLoads.map((load) =>
    `M${load.weekIndex}: ${load.focusCategory || 'Sin énfasis'} · I ${load.intensity} · V ${load.volume}`
  );

  return [
    objective.trim() ? `Objetivo: ${objective.trim()}` : '',
    'Autogenerado desde cargas del wizard.',
    loadLines.length ? `Cargas por microciclo:\n${loadLines.join('\n')}` : '',
  ].filter(Boolean).join('\n');
};

export const formatSessionPlanningDescription = ({
  sessionLoads = {},
} = {}) => {
  const loadLines = Object.values(sessionLoads)
    .sort((first, second) => Number(first.dayOfWeek || 1) - Number(second.dayOfWeek || 1))
    .map((load) =>
      `S${load.dayOfWeek}: ${load.focusCategory || 'Sin énfasis'} · I ${load.intensity} · V ${load.volume}`
    );

  return [
    'Autogenerado desde cargas de sesiones del wizard.',
    loadLines.length ? `Cargas por sesión:\n${loadLines.join('\n')}` : '',
  ].filter(Boolean).join('\n');
};
