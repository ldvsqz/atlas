import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

function ExercisePrintRow({ exercise, index, blockKey }) {
  const exerciseName = exercise?.name || 'Ejercicio no encontrado';
  const noteText = exercise?.notes || exercise?.note;
  const descriptionText = exercise?.description;
  const notes =
    blockKey === 'mainBlock' || blockKey === 'extraBlock'
      ? noteText || ''
      : noteText || descriptionText || '';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: { xs: 1.5, sm: 2 },
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <Chip label={index + 1} size="small" sx={{ fontWeight: 900, width: 34, flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
            {exerciseName}
          </Typography>
          {notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
              {notes}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

export default ExercisePrintRow;
