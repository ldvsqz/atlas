import React, { forwardRef, useMemo } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import { CYCLE_LABELS } from '../models/trainingModels';
import DayPrintCard from './DayPrintCard';
import { createExerciseMap, groupDaysByWeek } from './publicCycleUtils';

const CyclePrintLayout = forwardRef(function CyclePrintLayout({ cycle, days, exercises }, ref) {
  const groupedDays = useMemo(() => groupDaysByWeek(days), [days]);
  const exerciseMap = useMemo(() => createExerciseMap(exercises), [exercises]);
  const plannedExercises = days.reduce(
    (total, day) =>
      total
      + (day.mainBlock?.exerciseIds?.length || 0)
      + (day.shadowBlock?.exerciseIds?.length || 0)
      + (day.extraBlock?.exerciseIds?.length || 0),
    0
  );

  return (
    <Box
      ref={ref}
      className="cycle-print-document"
      sx={{
        color: 'text.primary',
        bgcolor: 'background.default',
        minHeight: '100vh',
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1, md: 1.5 },
        '@media print': {
          bgcolor: '#fff',
          color: '#111827',
          px: 0,
          py: 0,
          minHeight: 'auto',
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 1080,
          mx: 'auto',
          bgcolor: 'background.paper',
          borderRadius: { xs: 1, md: 1 },
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.12)',
          '@media print': {
            maxWidth: 'none',
            boxShadow: 'none',
            borderRadius: 0,
          },
        }}
      >
        <Box
          component="header"
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '@media print': {
              p: '6mm 8mm',
              background: '#fff',
            },
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" component="h1" fontWeight={900} sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
                {cycle.name || 'Ciclo de entrenamiento'}
              </Typography>
              {cycle.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.25,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  }}
                >
                  {cycle.description}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
              <Chip icon={<LayersIcon />} label={CYCLE_LABELS[cycle.type] || cycle.type || 'Ciclo'} color="primary" size="small" />
              <Chip label={`${Object.keys(groupedDays).length || 1} sem.`} size="small" variant="outlined" />
              <Chip label={`${days.length} días`} size="small" variant="outlined" />
              <Chip label={`${plannedExercises} ejercicios`} size="small" variant="outlined" />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 }, '@media print': { p: '6mm 8mm 10mm' } }}>
          <Stack spacing={{ xs: 3, md: 4 }}>
            {Object.entries(groupedDays).map(([weekIndex, weekDays]) => (
              <Box
                key={weekIndex}
                component="section"
                sx={{
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h5" fontWeight={900}>
                    Semana {weekIndex}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {weekDays.length} días
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  {weekDays.map((day) => (
                    <DayPrintCard key={day.id || day.dayIndex} day={day} exerciseMap={exerciseMap} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
});

export default CyclePrintLayout;
