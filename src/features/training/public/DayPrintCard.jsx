import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import ExercisePrintRow from './ExercisePrintRow';
import { getBlockTitle } from './publicCycleUtils';

const BLOCKS = ['warmupBlock', 'shadowBlock', 'mainBlock', 'extraBlock'];

function TrainingBlock({ blockKey, block, exerciseMap }) {
  const exerciseIds = block?.exerciseIds || [];
  const hasNotes = Boolean(block?.notes?.trim());

  return (
    <Box
      sx={{
        borderLeft: '4px solid',
        borderColor: blockKey === 'mainBlock' ? 'primary.main' : 'divider',
        pl: { xs: 1.5, sm: 2 },
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={900}>
          {getBlockTitle(blockKey)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {exerciseIds.length} ejercicio{exerciseIds.length === 1 ? '' : 's'}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        {exerciseIds.length ? (
          exerciseIds.map((exerciseId, index) => (
            <ExercisePrintRow
              key={`${blockKey}-${exerciseId}-${index}`}
              exercise={exerciseMap.get(String(exerciseId))}
              index={index}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            {blockKey === 'warmupBlock'
              ? 'Calentamiento general indicado por el entrenador.'
              : 'Sin ejercicios asignados.'}
          </Typography>
        )}

        {hasNotes && (
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              Notas del bloque
            </Typography>
            <Typography variant="body2">{block.notes}</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

function DayPrintCard({ day, exerciseMap }) {
  return (
    <Box
      component="article"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 },
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Día {day.dayOfWeek || day.dayIndex}
          </Typography>
          <Typography variant="h6" fontWeight={900}>
            {day.name || `Día ${day.dayIndex}`}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          Semana {day.weekIndex || 1}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={2.25}>
        {BLOCKS.map((blockKey) => (
          <TrainingBlock
            key={blockKey}
            blockKey={blockKey}
            block={day[blockKey]}
            exerciseMap={exerciseMap}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default DayPrintCard;
