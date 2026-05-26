import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LayersIcon from '@mui/icons-material/Layers';
import { CYCLE_LABELS } from '../models/trainingModels';
import DayPrintCard from './DayPrintCard';
import { groupDaysByWeek } from './publicCycleUtils';

const STORAGE_KEY = 'PUBLIC_CYCLE_WEEK_EXPANSION_STATE';

function loadWeekExpansionState(cycleId) {
  if (!cycleId || typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored)[cycleId] || null : null;
  } catch (error) {
    return null;
  }
}

function saveWeekExpansionState(cycleId, expandedWeeks) {
  if (!cycleId || typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const current = stored ? JSON.parse(stored) : {};
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...current,
      [cycleId]: expandedWeeks,
    }));
  } catch (error) {
    // ignore storage errors
  }
}

const CyclePrintLayout = forwardRef(function CyclePrintLayout({ cycle, days, showHeader = true, circuitDetails = {} }, ref) {
  const groupedDays = useMemo(() => groupDaysByWeek(days), [days]);
  const [expandedWeeks, setExpandedWeeks] = useState({});

  useEffect(() => {
    if (!cycle?.id) return;
    const storedState = loadWeekExpansionState(cycle.id);
    const defaultState = Object.keys(groupedDays).reduce((state, weekIndex) => ({
      ...state,
      [weekIndex]: true,
    }), {});
    setExpandedWeeks(storedState || defaultState);
  }, [cycle?.id, groupedDays]);

  useEffect(() => {
    if (!cycle?.id) return;
    saveWeekExpansionState(cycle.id, expandedWeeks);
  }, [cycle?.id, expandedWeeks]);

  const plannedNotes = days.reduce(
    (total, day) =>
      total
      + (day.mainBlock?.notes?.trim() ? 1 : 0)
      + (day.shadowBlock?.notes?.trim() ? 1 : 0),
    0
  );
  const linkedLayouts = days.filter((day) => day.mainBlock?.gymLayoutId || day.mainBlock?.gymLayoutName).length;

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
        {showHeader && (
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
                <Chip label={`${days.length} sesiones`} size="small" variant="outlined" />
                <Chip label={`${plannedNotes} notas`} size="small" variant="outlined" />
                <Chip label={`${linkedLayouts} circuitos`} size="small" variant="outlined" />
              </Stack>
            </Stack>
          </Box>
        )}

        <Box sx={{ p: { xs: 1.25, sm: 2, md: 3 }, '@media print': { p: '6mm 8mm 10mm' } }}>
          <Stack spacing={{ xs: 3, md: 4 }}>
            {Object.entries(groupedDays).map(([weekIndex, weekDays]) => (
              <Box
                key={weekIndex}
                component="section"
                id={`public-week-${weekIndex}`}
                sx={{
                  scrollMarginTop: 72,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <Accordion
                  expanded={expandedWeeks[weekIndex] === true}
                  onChange={() =>
                    setExpandedWeeks((current) => ({
                      ...current,
                      [weekIndex]: !current[weekIndex],
                    }))
                  }
                  disableGutters
                  square
                  sx={{
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&::before': { display: 'none' },
                    bgcolor: 'background.paper',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ minWidth: 0, width: '100%' }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                        <Typography variant="h5" fontWeight={900}>
                          Microciclo {weekIndex}
                        </Typography>
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {weekDays.length} sesiones
                        </Typography>
                      </Stack>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Stack spacing={2} sx={{ p: 2 }}>
                      {weekDays.map((day) => (
                        <DayPrintCard
                          key={day.id || day.dayIndex}
                          day={day}
                          circuitDetails={circuitDetails[day.mainBlock?.gymLayoutId]}
                        />
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
});

export default CyclePrintLayout;
