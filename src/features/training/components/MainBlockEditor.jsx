import React from 'react';
import { Box, Stack, TextField } from '@mui/material';
import ExerciseSelector from './ExerciseSelector';

function MainBlockEditor({ block, exercises, onChange, disabled = false }) {
  const currentBlock = block || { notes: '', exerciseIds: [] };

  const updateBlock = (field, value) => {
    onChange({
      ...currentBlock,
      [field]: value,
    });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Stack spacing={1.5}>
        <ExerciseSelector
          exercises={exercises}
          value={currentBlock.exerciseIds || []}
          onChange={(exerciseIds) => updateBlock('exerciseIds', exerciseIds)}
          disabled={disabled}
        />
        <TextField
          label="Notas"
          value={currentBlock.notes || ''}
          onChange={(event) => updateBlock('notes', event.target.value)}
          disabled={disabled}
          minRows={2}
          multiline
          fullWidth
        />
      </Stack>
    </Box>
  );
}

export default MainBlockEditor;
