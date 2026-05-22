import React, { useState } from 'react';
import {
  Box,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

function LayoutExerciseList({
  exercises = [],
  listNotes = '',
  onReorder,
  onListNotesChange,
}) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDragStart = (event, exerciseId) => {
    setDraggingId(exerciseId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', exerciseId);
  };

  const handleDragOver = (event, exerciseId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverId(exerciseId);
  };

  const handleDrop = (event, targetExerciseId) => {
    event.preventDefault();
    const sourceExerciseId = event.dataTransfer.getData('text/plain') || draggingId;
    if (sourceExerciseId && sourceExerciseId !== targetExerciseId) {
      onReorder(sourceExerciseId, targetExerciseId);
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0px 4px 12px rgba(0,0,0,0.02)' }}>
      <Box sx={{ p: isMobile ? 1.5 : 2 }}>
        <Typography variant={isMobile ? 'body1' : 'h6'} fontWeight={900}>
          Orden de rutina
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Lista generada según la posición del plano
        </Typography>
      </Box>

      <Divider />

      <Stack spacing={1} sx={{ p: isMobile ? 1.5 : 2, maxHeight: 400, overflowY: 'auto' }}>
        {exercises.length ? (
          exercises.map((exercise, index) => (
            <Box
              key={exercise.id}
              draggable
              onDragStart={(event) => handleDragStart(event, exercise.id)}
              onDragOver={(event) => handleDragOver(event, exercise.id)}
              onDrop={(event) => handleDrop(event, exercise.id)}
              onDragEnd={handleDragEnd}
              sx={(theme) => ({
                p: isMobile ? 1.25 : 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: dragOverId === exercise.id ? 'primary.main' : 'divider',
                bgcolor: alpha(exercise.color || theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                cursor: 'grab',
                opacity: draggingId === exercise.id ? 0.4 : 1,
                transition: 'all 140ms ease',
                transform: dragOverId === exercise.id && draggingId !== exercise.id ? 'translateY(2px)' : 'none',
              })}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <DragIndicatorIcon color="action" sx={{ flex: '0 0 auto' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight={800} variant="body2" sx={{ overflowWrap: 'anywhere', lineHeight: 1.2 }}>
                    {index + 1}. {exercise.name}
                  </Typography>
                  {exercise.description && !isMobile && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', overflowWrap: 'anywhere' }}>
                      {exercise.description}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          ))
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography fontWeight={800} variant="body2">Sin ejercicios colocados</Typography>
            <Typography variant="caption" color="text.secondary">
              Agrega elementos al plano para armar la lista.
            </Typography>
          </Box>
        )}
      </Stack>

      <Divider />

      <Box sx={{ p: isMobile ? 1.5 : 2, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.01) }}>
        <TextField
          label="Notas de la rutina"
          multiline
          rows={isMobile ? 2 : 3}
          value={listNotes}
          onChange={(event) => onListNotesChange?.(event.target.value)}
          fullWidth
          size="small"
        />
      </Box>
    </Paper>
  );
}

export default LayoutExerciseList;