import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

function ExercisePrintRow({ exercise, index }) {
  const exerciseName = exercise?.name || 'Ejercicio no encontrado';
  const notes = exercise?.notes || exercise?.note || exercise?.description || '';

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
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            {exercise?.category && <Chip label={exercise.category} size="small" variant="outlined" />}
            {exercise?.intensity && <Chip label={exercise.intensity} size="small" variant="outlined" />}
            {exercise?.equipment && <Chip label={exercise.equipment} size="small" icon={<FitnessCenterIcon />} variant="outlined" />}
          </Stack>
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
