import React, { useState } from 'react';
import {
  Box,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
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
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={900}>
          Lista de ejercicios
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Orden, descripción y notas generales.
        </Typography>
      </Box>

      <Divider />

      <Stack spacing={1.25} sx={{ p: 2, maxHeight: { lg: 760 }, overflowY: 'auto' }}>
        <TextField
          label="Notas de la lista"
          value={listNotes}
          onChange={(event) => onListNotesChange(event.target.value)}
          fullWidth
          multiline
          minRows={3}
        />

        {exercises.length ? exercises.map((exercise, index) => (
          <Box
            key={exercise.id}
            draggable
            onDragStart={(event) => handleDragStart(event, exercise.id)}
            onDragOver={(event) => handleDragOver(event, exercise.id)}
            onDrop={(event) => handleDrop(event, exercise.id)}
            onDragEnd={handleDragEnd}
            sx={(theme) => ({
              p: 1.25,
              borderRadius: 1,
              border: '1px solid',
              borderColor: dragOverId === exercise.id ? 'primary.main' : 'divider',
              bgcolor: alpha(exercise.color || theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.05),
              cursor: 'grab',
              opacity: draggingId === exercise.id ? 0.54 : 1,
              transition: 'border-color 140ms ease, opacity 140ms ease, transform 140ms ease',
              transform: dragOverId === exercise.id && draggingId !== exercise.id ? 'translateY(2px)' : 'none',
            })}
          >
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <DragIndicatorIcon color="action" sx={{ mt: 0.2, flex: '0 0 auto' }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
                  {index + 1}. {exercise.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                  {exercise.description}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography fontWeight={800}>Sin ejercicios colocados</Typography>
            <Typography variant="body2" color="text.secondary">
              Arrastra ejercicios al grid para construir la lista.
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default LayoutExerciseList;
