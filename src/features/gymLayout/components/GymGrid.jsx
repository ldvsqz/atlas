import React, { useMemo, useRef } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  getReservedCellsForGrid,
  fromGridLayoutItem,
  removeReservedCollisions,
  toGridLayoutItem,
} from '../models/gymLayoutModels';

const ResponsiveGridLayout = WidthProvider(Responsive);

const getExerciseFromDragEvent = (event) => {
  const raw = event.dataTransfer?.getData('application/atlas-gym-exercise');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid exercise drag payload:', error);
    }
  }

  const exerciseId = event.dataTransfer?.getData('text/plain');
  return exerciseId ? { id: exerciseId, width: 1, height: 1 } : null;
};

function GymGrid({
  layout,
  exercises,
  onLayoutChange,
  onDropExercise,
  onRemoveExercise,
}) {
  const isDroppingRef = useRef(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cellSize = isMobile ? 84 : 118;
  const rowHeight = cellSize;
  const margin = isMobile ? [8, 8] : [12, 12];
  const boardWidth = layout.cols * cellSize + Math.max(0, layout.cols - 1) * margin[0] + margin[0] * 2;
  const boardHeight = layout.rows * cellSize + Math.max(0, layout.rows - 1) * margin[1] + margin[1] * 2;
  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const gridItems = useMemo(
    () => removeReservedCollisions(layout.items, layout.rows, layout.cols)
      .filter((item) => exercisesById.has(item.exerciseId)),
    [exercisesById, layout.cols, layout.items, layout.rows]
  );

  const reservedCells = useMemo(
    () => getReservedCellsForGrid(layout.rows, layout.cols),
    [layout.cols, layout.rows]
  );

  const reactGridLayout = useMemo(
    () => [
      ...reservedCells.map((cell) => ({
        i: cell.id,
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        static: true,
        isDraggable: false,
        isResizable: false,
      })),
      ...gridItems.map((item) => ({
        ...toGridLayoutItem(item, exercisesById.get(item.exerciseId)),
        maxW: layout.cols,
        maxH: layout.rows,
      })),
    ],
    [exercisesById, gridItems, layout.cols, layout.rows, reservedCells]
  );

  const layoutKey = useMemo(
    () => [
      layout.cols,
      layout.rows,
      ...reservedCells.map((cell) => `${cell.id}:${cell.x},${cell.y}`),
      ...gridItems.map((item) => item.exerciseId).sort(),
    ].join('|'),
    [gridItems, layout.cols, layout.rows, reservedCells]
  );

  const cols = useMemo(() => ({
    lg: layout.cols,
    md: layout.cols,
    sm: layout.cols,
    xs: layout.cols,
    xxs: layout.cols,
  }), [layout.cols]);

  const handleLayoutChange = (nextLayout) => {
    if (isDroppingRef.current) return;

    const nextItems = nextLayout
      .filter((item) => item.i !== '__dropping-elem__' && !item.i.startsWith('__reserved_'))
      .map(fromGridLayoutItem);

    onLayoutChange(removeReservedCollisions(nextItems, layout.rows, layout.cols));
  };

  const handleDrop = (_, droppedItem, event) => {
    const exercise = getExerciseFromDragEvent(event);
    if (!exercise?.id) return;

    isDroppingRef.current = true;
    onDropExercise(exercise.id, {
      x: droppedItem.x,
      y: droppedItem.y,
      w: Math.max(1, Number(exercise.width || droppedItem.w || 1)),
      h: Math.max(1, Number(exercise.height || droppedItem.h || 1)),
    });
    window.requestAnimationFrame(() => {
      isDroppingRef.current = false;
    });
  };

  const handleDropDragOver = (event) => {
    const exercise = getExerciseFromDragEvent(event);
    if (!exercise?.id) return false;

    return {
      w: Math.min(Math.max(1, Number(exercise.width || 1)), layout.cols),
      h: Math.min(Math.max(1, Number(exercise.height || 1)), layout.rows),
    };
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        overflow: 'hidden',
        minHeight: 420,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={(localTheme) => ({
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(localTheme.palette.primary.main, localTheme.palette.mode === 'dark' ? 0.08 : 0.04),
        })}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <GridOnIcon color="primary" />
          <Box>
            <Typography fontWeight={900}>Plano del gimnasio</Typography>
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          p: { xs: 1, sm: 2 },
          overflowX: 'auto',
        }}
      >
        <Box
          sx={{
            width: boardWidth,
            minWidth: boardWidth,
            position: 'relative',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: (localTheme) => alpha(localTheme.palette.text.primary, localTheme.palette.mode === 'dark' ? 0.025 : 0.018),
            backgroundImage: (localTheme) => `
              linear-gradient(${alpha(localTheme.palette.divider, 0.75)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha(localTheme.palette.divider, 0.75)} 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize + margin[0]}px ${cellSize + margin[1]}px`,
            backgroundPosition: `${margin[0] / 2}px ${margin[1] / 2}px`,
            '& .react-grid-item.react-grid-placeholder': {
              bgcolor: alpha(theme.palette.primary.main, 0.22),
              border: `1px dashed ${theme.palette.primary.main}`,
              borderRadius: 1,
            },
            '& .react-grid-item > .react-resizable-handle::after': {
              borderRightColor: alpha(theme.palette.text.primary, 0.6),
              borderBottomColor: alpha(theme.palette.text.primary, 0.6),
            },
            '& .react-grid-item > .react-resizable-handle': {
              width: 22,
              height: 22,
              bottom: 2,
              right: 2,
            },
          }}
        >
          <ResponsiveGridLayout
            key={layoutKey}
            className="layout"
            layouts={{ lg: reactGridLayout, md: reactGridLayout, sm: reactGridLayout, xs: reactGridLayout, xxs: reactGridLayout }}
            breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 320, xxs: 0 }}
            cols={cols}
            rowHeight={rowHeight}
            margin={margin}
            containerPadding={margin}
            maxRows={layout.rows}
            isBounded
            isDroppable
            isResizable
            preventCollision
            allowOverlap={false}
            compactType={null}
            useCSSTransforms
            resizeHandles={['se']}
            droppingItem={{ i: '__dropping-elem__', w: 1, h: 1 }}
            onDrop={handleDrop}
            onDropDragOver={handleDropDragOver}
            onLayoutChange={handleLayoutChange}
            style={{ minHeight: boardHeight }}
          >
            {gridItems.map((item) => {
              const exercise = exercisesById.get(item.exerciseId);
              const gridConfig = {
                ...toGridLayoutItem(item, exercise),
                maxW: layout.cols,
                maxH: layout.rows,
              };
              return (
                <Box key={item.exerciseId} data-grid={gridConfig}>
                  <Box
                    sx={(localTheme) => ({
                      height: '100%',
                      p: 1,
                      pr: 3.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: alpha(exercise.color || localTheme.palette.primary.main, 0.45),
                      bgcolor: alpha(exercise.color || localTheme.palette.primary.main, localTheme.palette.mode === 'dark' ? 0.24 : 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'grab',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: `inset 0 0 0 1px ${alpha(exercise.color || localTheme.palette.primary.main, 0.2)}`,
                    })}
                  >
                    <Tooltip title="Quitar del plano">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Quitar ${exercise.name} del plano`}
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveExercise?.(exercise.id);
                        }}
                        sx={(localTheme) => ({
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          bgcolor: alpha(localTheme.palette.background.paper, 0.86),
                          border: '1px solid',
                          borderColor: alpha(localTheme.palette.error.main, 0.35),
                          '&:hover': {
                            bgcolor: alpha(localTheme.palette.error.main, 0.12),
                          },
                        })}
                      >
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>

                    <Typography
                      fontWeight={900}
                      sx={{
                        color: 'text.primary',
                        lineHeight: 1.12,
                        whiteSpace: 'normal',
                        overflowWrap: 'break-word',
                        wordBreak: 'normal',
                        hyphens: 'auto',
                        width: '100%',
                        fontSize: item.w > 1 || item.h > 1 ? 15 : 13,
                      }}
                    >
                      {exercise.name}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {reservedCells.map((cell) => (
              <Box
                key={cell.id}
                data-grid={{
                  i: cell.id,
                  x: cell.x,
                  y: cell.y,
                  w: cell.w,
                  h: cell.h,
                  static: true,
                  isDraggable: false,
                  isResizable: false,
                }}
              >
                <Box
                  sx={(localTheme) => ({
                    height: '100%',
                    p: 1.25,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: alpha(cell.color, 0.5),
                    bgcolor: alpha(cell.color, localTheme.palette.mode === 'dark' ? 0.2 : 0.12),
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: `inset 0 0 0 1px ${alpha(cell.color, 0.18)}`,
                    cursor: 'not-allowed',
                  })}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <LockIcon fontSize="small" sx={{ color: cell.color }} />
                    <Typography fontWeight={900} sx={{ lineHeight: 1.1 }}>
                      {cell.label}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {cell.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </ResponsiveGridLayout>
        </Box>
      </Box>
    </Paper>
  );
}

export default GymGrid;
