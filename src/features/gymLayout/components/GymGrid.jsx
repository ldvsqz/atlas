import React, { useMemo, useRef } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
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

function GymGrid({
  layout,
  exercises,
  onLayoutChange,
  onDropExercise,
  onRemoveExercise,
  selectedActiveExercise,
  onSelectExercise,
}) {
  const isDroppingRef = useRef(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const cellSize = isMobile ? 90 : 110; 
  const margin = isMobile ? [4, 4] : [10, 10];

  const boardWidth = layout.cols * cellSize + (layout.cols - 1) * margin[0] + margin[0] * 2;
  const boardHeight = layout.rows * cellSize + (layout.rows - 1) * margin[1] + margin[1] * 2;

  const exercisesById = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const gridItems = useMemo(
    () => removeReservedCollisions(layout.items, layout.rows, layout.cols).filter((i) => exercisesById.has(i.exerciseId)),
    [exercisesById, layout.cols, layout.items, layout.rows]
  );

  const reservedCells = useMemo(() => getReservedCellsForGrid(layout.rows, layout.cols), [layout.rows, layout.cols]);

  const reactGridLayout = useMemo(() => [
    ...reservedCells.map((c) => ({ i: c.id, x: c.x, y: c.y, w: c.w, h: c.h, static: true })),
    ...gridItems.map((item) => ({ ...toGridLayoutItem(item, exercisesById.get(item.exerciseId)), maxW: layout.cols, maxH: layout.rows })),
  ], [exercisesById, gridItems, layout.cols, layout.rows, reservedCells]);

  const handleLayoutChange = (nextLayout) => {
    if (isDroppingRef.current) return;
    const items = nextLayout
      .filter((i) => i.i !== '__dropping-elem__' && !i.i.startsWith('__reserved_'))
      .map(fromGridLayoutItem);
    onLayoutChange(removeReservedCollisions(items, layout.rows, layout.cols));
  };

  const handleBackgroundGridClick = (e) => {
    if (!selectedActiveExercise) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - margin[0];
    const clickY = e.clientY - rect.top - margin[1];
    
    const colIndex = Math.floor(clickX / (cellSize + margin[0]));
    const rowIndex = Math.floor(clickY / (cellSize + margin[1]));

    if (colIndex >= 0 && colIndex < layout.cols && rowIndex >= 0 && rowIndex < layout.rows) {
      onDropExercise(selectedActiveExercise.id, {
        x: colIndex,
        y: rowIndex,
        w: selectedActiveExercise.width || 1,
        h: selectedActiveExercise.height || 1,
      });
    }
  };

  return (
    <Paper 
      variant={isMobile ? "none" : "outlined"} 
      sx={{ 
        borderRadius: isMobile ? 0 : 3, 
        overflow: 'hidden', 
        bgcolor: isMobile ? 'transparent' : 'background.paper',
        width: '100%',
        marginLeft: isMobile ? '-16px' : 0, 
        marginRight: isMobile ? '-16px' : 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {!isMobile && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <GridOnIcon color="primary" />
            <Typography fontWeight={900}>Distribución del Plano</Typography>
          </Stack>
        </Box>
      )}

      <Box 
        sx={{ 
          p: isMobile ? 0.5 : 2, 
          overflowX: 'auto', 
          bgcolor: isMobile ? 'transparent' : (theme.palette.mode === 'dark' ? '#121212' : '#f8fafc'),
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box
          onClick={handleBackgroundGridClick}
          sx={{
            width: boardWidth,
            height: boardHeight,
            position: 'relative',
            borderRadius: 2,
            border: isMobile ? '1px solid' : '2px dashed', 
            borderColor: selectedActiveExercise ? 'primary.main' : alpha(theme.palette.divider, 0.4),
            cursor: selectedActiveExercise ? 'cell' : 'default',
            backgroundImage: (t) => isMobile ? 'none' : `
              linear-gradient(${alpha(t.palette.divider, 0.4)} 1px, transparent 1px),
              linear-gradient(90deg, ${alpha(t.palette.divider, 0.4)} 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize + margin[0]}px ${cellSize + margin[1]}px`,
            backgroundPosition: `${margin[0]}px ${margin[1]}px`,
            bgcolor: isMobile ? alpha(theme.palette.background.paper, 0.6) : 'transparent',
          }}
        >
          <ResponsiveGridLayout
            layouts={{ lg: reactGridLayout, md: reactGridLayout, sm: reactGridLayout, xs: reactGridLayout, xxs: reactGridLayout }}
            breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 320, xxs: 0 }}
            cols={{ lg: layout.cols, md: layout.cols, sm: layout.cols, xs: layout.cols, xxs: layout.cols }}
            rowHeight={cellSize}
            margin={margin}
            containerPadding={margin}
            isDraggable={!isMobile} 
            isResizable={!isMobile}
            onLayoutChange={handleLayoutChange}
            style={{ height: '100%' }}
          >
            {gridItems.map((item) => {
              const ex = exercisesById.get(item.exerciseId);
              const color = ex.color || theme.palette.primary.main;
              const isBeingMoved = selectedActiveExercise?.id === ex.id;

              return (
                <Box key={item.exerciseId}>
                  <Box
                    onClick={(e) => {
                      if (isMobile) {
                        e.stopPropagation();
                        onRemoveExercise(ex.id);
                        onSelectExercise(ex);
                      }
                    }}
                    sx={{
                      height: '100%',
                      borderRadius: 1.5,
                      border: `1.5px solid ${isBeingMoved ? theme.palette.primary.main : alpha(color, 0.45)}`,
                      bgcolor: alpha(color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1,
                      boxSizing: 'border-box',
                      position: 'relative',
                      opacity: isBeingMoved ? 0.4 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    {/* BOTÓN CORREGIDO: Dimensiones y padding estrictos para no tapar la celda */}
                    <IconButton
                      size="small"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onRemoveExercise(ex.id); 
                      }}
                      sx={{ 
                        position: 'absolute', 
                        top: 4, 
                        right: 4, 
                        zIndex: 10,
                        p: 0, // Elimina el padding expansivo predeterminado
                        width: 16, // Ancho delimitado
                        height: 16, // Alto delimitado
                        minWidth: 16,
                        bgcolor: theme.palette.background.paper,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.error.main, 0.3),
                        borderRadius: '4px',
                        boxShadow: theme.shadows[1],
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } 
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 10, color: 'error.main', fontWeight: 'bold' }} />
                    </IconButton>

                    <Typography 
                      variant="caption" 
                      fontWeight={800} 
                      align="center" 
                      sx={{ 
                        color: 'text.primary', 
                        fontSize: isMobile ? 10.5 : 12, 
                        lineHeight: 1.1,
                        overflowWrap: 'break-word',
                        width: '100%',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        userSelect: 'none',
                        px: 0.5
                      }}
                    >
                      {ex.name}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {reservedCells.map((cell) => (
              <Box key={cell.id}>
                <Box sx={{ height: '100%', borderRadius: 1.5, bgcolor: alpha(cell.color, 0.05), border: `1px solid ${alpha(cell.color, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, opacity: 0.8 }}>
                  <LockIcon sx={{ color: cell.color, fontSize: 12 }} />
                  {!isMobile && <Typography fontWeight={800} sx={{ fontSize: 10, color: cell.color }}>{cell.label}</Typography>}
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