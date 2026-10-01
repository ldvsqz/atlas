export const DEFAULT_LAYOUT_ID = 'main-floor';

export const DEFAULT_GRID_ROWS = 6;
export const DEFAULT_GRID_COLS = 3;

export const DEFAULT_RESERVED_GRID_CELLS = [
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

export const RESERVED_GRID_CELLS = DEFAULT_RESERVED_GRID_CELLS;

export const EXERCISE_CATEGORIES = [
  'Técnica',
  'Escuela de combate',
  'Coordinación',
  'Acondicionamiento',
  'Potencia y pliometría',
  'Reacción',
];

export const EXERCISE_CATEGORY_COLORS = {
  Técnica: '#2563EB',
  'Escuela de combate': '#7C3AED',
  Coordinación: '#0891B2',
  Acondicionamiento: '#16A34A',
  'Potencia y pliometría"': '#EA580C',
  Reacción: '#DB2777',
};

export const getGymExerciseCategoryColor = (category) =>
  EXERCISE_CATEGORY_COLORS[category] || EXERCISE_CATEGORY_COLORS[EXERCISE_CATEGORIES[0]];

export const formatGymLayoutName = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value.replaceAll('.', '').toLowerCase()]));

  return `C-${dateParts.weekday}.${dateParts.day}.${dateParts.month}.${dateParts.year}`;
};

export const createGymExerciseModel = (values = {}) => {
  const category = EXERCISE_CATEGORIES.includes(values.category) ? values.category : EXERCISE_CATEGORIES[0];

  return {
    id: values.id || '',
    name: values.name || '',
    description: values.description || '',
    imageDataUrl: values.imageDataUrl || '',
    imageName: values.imageName || '',
    width: Number(values.width || 1),
    height: Number(values.height || 1),
    category,
    color: getGymExerciseCategoryColor(category),
    createdAt: values.createdAt || null,
  };
};

export const createGymLayoutModel = (values = {}) => ({
  id: values.id || DEFAULT_LAYOUT_ID,
  name: values.name || 'Circuito principal',
  rows: Math.max(1, Number(values.rows || DEFAULT_GRID_ROWS)),
  cols: Math.max(1, Number(values.cols || DEFAULT_GRID_COLS)),
  reservedCells: Array.isArray(values.reservedCells)
    ? values.reservedCells.map(normalizeReservedCell)
    : DEFAULT_RESERVED_GRID_CELLS.map(normalizeReservedCell),
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

export const normalizeReservedCell = (cell = {}) => ({
  id: String(cell.id || `__reserved_${Date.now()}__`),
  label: String(cell.label || 'Zona bloqueada'),
  description: String(cell.description || 'bloqueado'),
  x: Math.max(0, Number(cell.x || 0)),
  y: Math.max(0, Number(cell.y || 0)),
  w: Math.max(1, Number(cell.w || cell.width || 1)),
  h: Math.max(1, Number(cell.h || cell.height || 1)),
  color: String(cell.color || '#64748B'),
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

export const getReservedCellsForGrid = (
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  reservedCells = DEFAULT_RESERVED_GRID_CELLS
) =>
  (reservedCells || [])
    .map(normalizeReservedCell)
    .filter((cell) => (
      cell.x >= 0
      && cell.y >= 0
      && cell.x + cell.w <= cols
      && cell.y + cell.h <= rows
    ));

export const collidesWithReservedCell = (
  item,
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  reservedCells = DEFAULT_RESERVED_GRID_CELLS
) =>
  getReservedCellsForGrid(rows, cols, reservedCells).some((cell) => rectanglesOverlap(item, cell));

export const removeReservedCollisions = (
  items = [],
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  reservedCells = DEFAULT_RESERVED_GRID_CELLS
) =>
  clampLayoutItems(items, rows, cols).filter((item) => !collidesWithReservedCell(item, rows, cols, reservedCells));

export const getExerciseSizeLabel = (exercise) => `${exercise.width || 1}x${exercise.height || 1}`;
