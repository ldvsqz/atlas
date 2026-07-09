import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  getReservedCellsForGrid,
  rectanglesOverlap,
} from '../../gymLayout/models/gymLayoutModels.js';

export const MAIN_CIRCUIT_LAPS = 2;
export const MAIN_CIRCUIT_STATION_COUNT = 5;
export const MAIN_CIRCUIT_WORK_MINUTES = 3;
export const MAIN_CIRCUIT_TRANSITION_MINUTES = 1;

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getExerciseSize = (exercise) => ({
  w: Math.max(1, Number(exercise?.width || exercise?.w || 1)),
  h: Math.max(1, Number(exercise?.height || exercise?.h || 1)),
});

const getCenter = (item) => ({
  x: item.x + (item.w / 2),
  y: item.y + (item.h / 2),
});

const getDistance = (first, second) => {
  const firstCenter = getCenter(first);
  const secondCenter = getCenter(second);
  return Math.abs(firstCenter.x - secondCenter.x) + Math.abs(firstCenter.y - secondCenter.y);
};

const isInsideGrid = (item, rows, cols) =>
  item.x >= 0
  && item.y >= 0
  && item.x + item.w <= cols
  && item.y + item.h <= rows;

const collidesAny = (item, placedItems = []) =>
  placedItems.some((placedItem) => rectanglesOverlap(item, placedItem));

const getCellRouteIndex = ({ x, y }, cols) =>
  y * cols + (y % 2 === 0 ? x : cols - 1 - x);

const getRouteIndex = (item, cols) => {
  let routeTotal = 0;
  let cellCount = 0;

  for (let y = item.y; y < item.y + item.h; y += 1) {
    for (let x = item.x; x < item.x + item.w; x += 1) {
      routeTotal += getCellRouteIndex({ x, y }, cols);
      cellCount += 1;
    }
  }

  return cellCount ? routeTotal / cellCount : 0;
};

const buildPlacementCandidates = ({ exercise, rows, cols, reservedCells }) => {
  const { w, h } = getExerciseSize(exercise);
  const candidates = [];

  if (w > cols || h > rows) return candidates;

  for (let y = 0; y <= rows - h; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      const candidate = {
        x,
        y,
        w,
        h,
        routeIndex: getRouteIndex({ x, y, w, h }, cols),
      };

      if (isInsideGrid(candidate, rows, cols) && !collidesAny(candidate, reservedCells)) {
        candidates.push(candidate);
      }
    }
  }

  return candidates.sort((first, second) => first.routeIndex - second.routeIndex);
};

const pickExercisesForCategories = ({ stationCategories, exercises }) => {
  const usedExerciseIds = new Set();

  return stationCategories.map((category) => {
    const normalizedCategory = normalizeText(category);
    const categoryMatches = exercises
      .filter((exercise) => normalizeText(exercise.category) === normalizedCategory)
      .sort((first, second) => String(first.name || '').localeCompare(String(second.name || '')));

    const selected = categoryMatches.find((exercise) => !usedExerciseIds.has(String(exercise.id))) || categoryMatches[0];

    if (!selected) {
      throw new Error(`No hay ejercicios disponibles en Firebase para la categoría "${category}".`);
    }

    usedExerciseIds.add(String(selected.id));
    return selected;
  });
};

const findCircuitPlacements = ({ selectedExercises, rows, cols, reservedCells }) => {
  const targetRouteStep = (rows * cols - 1) / Math.max(selectedExercises.length - 1, 1);
  const candidateGroups = selectedExercises.map((exercise, index) =>
    buildPlacementCandidates({ exercise, rows, cols, reservedCells })
      .map((candidate) => ({
        ...candidate,
        targetScore: Math.abs(candidate.routeIndex - (index * targetRouteStep)),
      }))
      .sort((first, second) => first.targetScore - second.targetScore)
  );

  const missingCandidateIndex = candidateGroups.findIndex((candidates) => candidates.length === 0);
  if (missingCandidateIndex >= 0) {
    const exercise = selectedExercises[missingCandidateIndex];
    throw new Error(`"${exercise.name}" no cabe dentro del grid del gimnasio.`);
  }

  let bestPlacement = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const search = (index, placedItems, score) => {
    if (score >= bestScore) return;

    if (index === selectedExercises.length) {
      bestPlacement = placedItems;
      bestScore = score;
      return;
    }

    candidateGroups[index].forEach((candidate) => {
      if (collidesAny(candidate, placedItems)) return;

      const previous = placedItems[placedItems.length - 1];
      const routeRegressionPenalty = previous && candidate.routeIndex < previous.routeIndex ? 20 : 0;
      const distanceScore = previous ? getDistance(previous, candidate) : 0;
      const nextScore = score + distanceScore + routeRegressionPenalty + (candidate.targetScore * 0.15);

      search(index + 1, [...placedItems, candidate], nextScore);
    });
  };

  search(0, reservedCells, 0);

  if (!bestPlacement) {
    throw new Error('No se pudo construir un circuito sin superposiciones dentro del grid.');
  }

  return bestPlacement.slice(reservedCells.length);
};

export const buildMainCircuit = ({
  stationCategories = [],
  exercises = [],
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  reservedCells = getReservedCellsForGrid(rows, cols),
} = {}) => {
  if (!Array.isArray(stationCategories) || stationCategories.length !== MAIN_CIRCUIT_STATION_COUNT) {
    throw new Error(`El circuito principal debe tener exactamente ${MAIN_CIRCUIT_STATION_COUNT} estaciones.`);
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error('No hay ejercicios de Firebase disponibles para construir el circuito.');
  }

  const selectedExercises = pickExercisesForCategories({ stationCategories, exercises });
  const placements = findCircuitPlacements({ selectedExercises, rows, cols, reservedCells });

  return {
    laps: MAIN_CIRCUIT_LAPS,
    workMinutes: MAIN_CIRCUIT_WORK_MINUTES,
    transitionMinutes: MAIN_CIRCUIT_TRANSITION_MINUTES,
    stations: selectedExercises.map((exercise, index) => ({
      order: index + 1,
      category: stationCategories[index],
      exerciseId: String(exercise.id),
      gridPosition: {
        x: placements[index].x,
        y: placements[index].y,
        w: placements[index].w,
        h: placements[index].h,
      },
    })),
  };
};

export const normalizeMainCircuit = (mainCircuit) => {
  if (!mainCircuit || !Array.isArray(mainCircuit.stations)) return null;

  return {
    laps: Number(mainCircuit.laps || MAIN_CIRCUIT_LAPS),
    workMinutes: Number(mainCircuit.workMinutes || MAIN_CIRCUIT_WORK_MINUTES),
    transitionMinutes: Number(mainCircuit.transitionMinutes || MAIN_CIRCUIT_TRANSITION_MINUTES),
    stations: mainCircuit.stations
      .map((station, index) => ({
        order: Number(station.order || index + 1),
        category: station.category || '',
        exerciseId: String(station.exerciseId || ''),
        gridPosition: {
          x: Number(station.gridPosition?.x || 0),
          y: Number(station.gridPosition?.y || 0),
          w: Math.max(1, Number(station.gridPosition?.w || station.gridPosition?.width || 1)),
          h: Math.max(1, Number(station.gridPosition?.h || station.gridPosition?.height || 1)),
        },
      }))
      .filter((station) => station.exerciseId)
      .sort((first, second) => first.order - second.order),
  };
};

export const validateMainCircuit = ({
  mainCircuit,
  exercises = [],
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  reservedCells = getReservedCellsForGrid(rows, cols),
} = {}) => {
  const normalizedCircuit = normalizeMainCircuit(mainCircuit);
  if (!normalizedCircuit) return 'El circuito principal es requerido.';

  if (normalizedCircuit.laps !== MAIN_CIRCUIT_LAPS) return `El circuito debe tener ${MAIN_CIRCUIT_LAPS} vueltas.`;
  if (normalizedCircuit.stations.length !== MAIN_CIRCUIT_STATION_COUNT) {
    return `El circuito debe tener exactamente ${MAIN_CIRCUIT_STATION_COUNT} estaciones.`;
  }

  const exercisesById = new Map(exercises.map((exercise) => [String(exercise.id), exercise]));
  const placedItems = [...reservedCells];

  for (const station of normalizedCircuit.stations) {
    const exercise = exercisesById.get(String(station.exerciseId));
    if (!exercise) return `La estación ${station.order} usa un ejercicio que no existe en Firebase.`;

    if (normalizeText(exercise.category) !== normalizeText(station.category)) {
      return `La estación ${station.order} no pertenece a la categoría "${station.category}".`;
    }

    const { w, h } = getExerciseSize(exercise);
    const item = {
      x: station.gridPosition.x,
      y: station.gridPosition.y,
      w: station.gridPosition.w,
      h: station.gridPosition.h,
    };

    if (item.w !== w || item.h !== h) {
      return `La estación ${station.order} no respeta el tamaño físico del ejercicio.`;
    }

    if (!isInsideGrid(item, rows, cols)) {
      return `La estación ${station.order} queda fuera del área del gimnasio.`;
    }

    if (collidesAny(item, placedItems)) {
      return `La estación ${station.order} se superpone con otra estación o zona bloqueada.`;
    }

    placedItems.push(item);
  }

  return true;
};
