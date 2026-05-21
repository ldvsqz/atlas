export const DEFAULT_LAYOUT_ID = 'main-floor';

export const DEFAULT_GRID_ROWS = 6;
export const DEFAULT_GRID_COLS = 3;

export const RESERVED_GRID_CELLS = [
  {
    id: '__reserved_bathroom__',
    label: 'Baño',
    description: 'bloquado',
    x: 0, // posición fija en la columna
    y: 0, // posición fija en la fila
    w: 1, // ocupa 1 columna
    h: 1, // ocupa 1 fila
    color: '#64748B',
  },
  {
    id: '__reserved_storage__',
    label: 'Bodega',
    description: 'bloquado',
    x: 1,
    y: 0,
    w: 1,
    h: 1,
    color: '#64748B',
  },
];

export const EXERCISE_COLORS = [
  '#7C3AED',
  '#0891B2',
  '#16A34A',
  '#EA580C',
  '#DB2777',
  '#2563EB',
  '#65A30D',
  '#DC2626',
];

export const EXERCISE_CATEGORIES = [
  'Técnica',
  'Físico',
  'Coordinación',
];

export const createGymExerciseModel = (values = {}) => ({
  id: values.id || '',
  name: values.name || '',
  description: values.description || '',
  width: Number(values.width || 1),
  height: Number(values.height || 1),
  color: values.color || EXERCISE_COLORS[0],
  category: values.category || '',
  createdAt: values.createdAt || null,
});

export const createGymLayoutModel = (values = {}) => ({
  id: values.id || DEFAULT_LAYOUT_ID,
  name: values.name || 'Plano principal',
  rows: DEFAULT_GRID_ROWS,
  cols: DEFAULT_GRID_COLS,
  items: Array.isArray(values.items) ? values.items.map(normalizeLayoutItem) : [],
  exerciseOrder: Array.isArray(values.exerciseOrder) ? values.exerciseOrder.map(String) : [],
  listNotes: values.listNotes || '',
  createdAt: values.createdAt || null,
  updatedAt: values.updatedAt || null,
});

export const normalizeLayoutItem = (item) => ({
  exerciseId: String(item.exerciseId || item.i || ''),
  x: Number(item.x || 0),
  y: Number(item.y || 0),
  w: Math.max(1, Number(item.w || item.width || 1)),
  h: Math.max(1, Number(item.h || item.height || 1)),
});

export const toGridLayoutItem = (item, exercise) => ({
  i: item.exerciseId,
  x: Number(item.x || 0),
  y: Number(item.y || 0),
  w: Math.max(1, Number(item.w || exercise?.width || 1)),
  h: Math.max(1, Number(item.h || exercise?.height || 1)),
  minW: 1,
  minH: 1,
  maxW: Math.max(1, Number(item.w || exercise?.width || 1)),
  maxH: Math.max(1, Number(item.h || exercise?.height || 1)),
});

export const fromGridLayoutItem = (item) => ({
  exerciseId: item.i,
  x: Number(item.x || 0),
  y: Number(item.y || 0),
  w: Math.max(1, Number(item.w || 1)),
  h: Math.max(1, Number(item.h || 1)),
});

export const clampLayoutItems = (items = [], rows = DEFAULT_GRID_ROWS, cols = DEFAULT_GRID_COLS) =>
  items
    .map(normalizeLayoutItem)
    .filter((item) => item.exerciseId)
    .map((item) => ({
      ...item,
      w: Math.min(Math.max(1, item.w), cols),
      h: Math.min(Math.max(1, item.h), rows),
      x: Math.min(Math.max(0, item.x), Math.max(0, cols - item.w)),
      y: Math.min(Math.max(0, item.y), Math.max(0, rows - item.h)),
    }));

export const rectanglesOverlap = (first, second) =>
  first.x < second.x + second.w
  && first.x + first.w > second.x
  && first.y < second.y + second.h
  && first.y + first.h > second.y;

export const getReservedCellsForGrid = (rows = DEFAULT_GRID_ROWS, cols = DEFAULT_GRID_COLS) =>
  RESERVED_GRID_CELLS.filter((cell) => (
    cell.x >= 0
    && cell.y >= 0
    && cell.x + cell.w <= cols
    && cell.y + cell.h <= rows
  ));

export const collidesWithReservedCell = (item, rows = DEFAULT_GRID_ROWS, cols = DEFAULT_GRID_COLS) =>
  getReservedCellsForGrid(rows, cols).some((cell) => rectanglesOverlap(item, cell));

export const removeReservedCollisions = (items = [], rows = DEFAULT_GRID_ROWS, cols = DEFAULT_GRID_COLS) =>
  clampLayoutItems(items, rows, cols).filter((item) => !collidesWithReservedCell(item, rows, cols));

export const getExerciseSizeLabel = (exercise) => `${exercise.width || 1}x${exercise.height || 1}`;
