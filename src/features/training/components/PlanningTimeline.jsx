import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { CYCLE_LABELS, TRAINING_WEEK_DAYS, normalizeCycleDay } from '../models/trainingModels';
import { useMicrocycleDays } from '../hooks/useMicrocycleDays';
import SessionEditorDrawer from './SessionEditorDrawer';

const TIMELINE_COLORS = {
  macro: {
    light: '#2e7d32',
    dark: '#66bb6a',
  },
  meso: {
    light: '#ed9f18',
    dark: '#ffb74d',
  },
  micro: {
    light: '#81d4fa',
    dark: '#4fc3f7',
  },
  session: {
    light: '#d84343',
    dark: '#ef767a',
  },
};

const getTimelineColor = (theme, colorKey) => (
  theme.palette.mode === 'dark'
    ? TIMELINE_COLORS[colorKey].dark
    : TIMELINE_COLORS[colorKey].light
);

const createMesocycleGroups = (weekCount) => {
  const groupSize = 4;
  const totalWeeks = Math.max(Number(weekCount) || 1, 1);
  const groupCount = Math.ceil(totalWeeks / groupSize);

  return Array.from({ length: groupCount }, (_, index) => {
    const startWeek = (index * groupSize) + 1;
    const endWeek = Math.min(startWeek + groupSize - 1, totalWeeks);

    return {
      id: `meso-${index + 1}`,
      label: `Mesociclo ${index + 1}`,
      startWeek,
      endWeek,
      weeks: endWeek - startWeek + 1,
    };
  });
};

const buildWeekGroups = (days, weeks) => {
  const normalizedDays = days.map(normalizeCycleDay);
  const weekMap = normalizedDays.reduce((groups, day) => {
    const weekIndex = Number(day.weekIndex || 1);

    return {
      ...groups,
      [weekIndex]: [...(groups[weekIndex] || []), day].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    };
  }, {});

  return Array.from({ length: Math.max(Number(weeks) || 1, 1) }, (_, index) => {
    const weekIndex = index + 1;
    return {
      weekIndex,
      days: weekMap[weekIndex] || [],
    };
  });
};

function TimelineLayerLabel({ label, detail }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, mb: 0.2 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>
        {label}
      </Typography>
      {detail && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ opacity: 0.85 }}>
          {detail}
        </Typography>
      )}
      <Box sx={{ height: 1, flex: 1, bgcolor: 'divider', minWidth: 18, opacity: 0.7 }} />
    </Stack>
  );
}

const hasNotes = (block) => Boolean(block?.notes?.trim());

const getSessionMeta = (day) => {
  const noteCount = [day.shadowBlock, day.mainBlock].filter(hasNotes).length;
  const layoutName = day.mainBlock?.gymLayoutName || (day.mainBlock?.mainCircuit ? 'Circuito generado' : '');

  return {
    noteCount,
    layoutName,
    hasContent: noteCount > 0 || Boolean(layoutName),
  };
};

function PlanningTimeline({ cycle }) {
  const { days, loading, savingDayId, updateDay } = useMicrocycleDays(cycle.id, cycle.weeks);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);
  const weekCount = Math.max(Number(cycle.weeks) || 1, 1);

  const weekGroups = useMemo(() => buildWeekGroups(days, weekCount), [days, weekCount]);
  const mesocycleGroups = useMemo(() => createMesocycleGroups(weekCount), [weekCount]);
  const selectedWeekGroup = weekGroups.find((weekGroup) => weekGroup.weekIndex === selectedWeek) || weekGroups[0];
  const selectedMesoGroup = mesocycleGroups.find(
    (group) => selectedWeek >= group.startWeek && selectedWeek <= group.endWeek
  );
  const selectedWeekSummary = selectedWeekGroup?.days?.length
    ? `${selectedWeekGroup.days.length} sesión${selectedWeekGroup.days.length === 1 ? '' : 'es'}`
    : 'Sin sesiones';
  const timelineMobileWidth = Math.max(weekCount * 72, 300);
  const timelineDesktopWidth = Math.max(weekCount * 92, 300);

  useEffect(() => {
    if (!weekGroups.some((weekGroup) => weekGroup.weekIndex === selectedWeek)) {
      setSelectedWeek(weekGroups[0]?.weekIndex || 1);
    }
  }, [selectedWeek, weekGroups]);

  const handleSaveSession = async (dayData) => {
    if (!selectedDay) return;

    await updateDay(selectedDay.id, dayData);
    setSelectedDay(null);
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!days.length) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          Este ciclo todavía no tiene días inicializados.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Al guardar el ciclo se crearán las sesiones por microciclo.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'grey.50',
        }}
      >
        <Box sx={{ p: { xs: 0.5, sm: 0.7 }, pb: 0.4 }}>
          <Box
            sx={{
              overflowX: 'auto',
              mx: { xs: -0.5, sm: -0.7 },
              px: { xs: 0.5, sm: 0.7 },
              pb: 0.35,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Stack spacing={0.35} sx={{ minWidth: { xs: timelineMobileWidth, sm: timelineDesktopWidth } }}>
              <TimelineLayerLabel label="Temporada" detail="Vista completa" />

              <Box
                sx={{
                  borderRadius: 1,
                  px: { xs: 0.6, sm: 0.75 },
                  py: 0.45,
                  bgcolor: (theme) => getTimelineColor(theme, 'macro'),
                  color: (theme) => theme.palette.getContrastText(getTimelineColor(theme, 'macro')),
                  boxShadow: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={900} sx={{ overflowWrap: 'anywhere', lineHeight: 1.05, fontSize: '0.8rem' }}>
                  {cycle.name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.05, fontSize: '0.62rem' }}>
                  {CYCLE_LABELS[cycle.type] || 'Ciclo'} · {weekCount} microciclo{weekCount === 1 ? '' : 's'}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 0.1,
                  py: 0.02,
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Semana {selectedWeek} · {selectedWeekSummary}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedMesoGroup?.label || 'Mesociclo 1'}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                  gap: 0.45,
                }}
              >
                {mesocycleGroups.map((group) => (
                  <Tooltip key={group.id} title={`Microciclos ${group.startWeek}-${group.endWeek}`}>
                    <Box
                      aria-label={`${group.label}, microciclos ${group.startWeek} a ${group.endWeek}`}
                      sx={{
                        gridColumn: `span ${group.weeks}`,
                        borderRadius: 1,
                        px: 0.45,
                        py: 0.35,
                        minHeight: 28,
                        bgcolor: (theme) => getTimelineColor(theme, 'meso'),
                        color: (theme) => theme.palette.getContrastText(getTimelineColor(theme, 'meso')),
                        boxShadow: selectedMesoGroup?.id === group.id ? 2 : 0,
                      }}
                    >
                      <Typography variant="caption" component="div" fontWeight={900} noWrap sx={{ lineHeight: 1.05, fontSize: '0.64rem' }}>
                        {group.label}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.04, fontSize: '0.58rem' }}>
                        S{group.startWeek}-{group.endWeek}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                  gap: 0.45,
                }}
              >
                {weekGroups.map((weekGroup) => {
                  const isSelected = weekGroup.weekIndex === selectedWeek;

                  return (
                    <Tooltip
                      key={weekGroup.weekIndex}
                      title={`${weekGroup.days.length} sesiones`}
                    >
                      <Box
                        component="button"
                        type="button"
                        aria-label={`Abrir microciclo ${weekGroup.weekIndex}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedWeek(weekGroup.weekIndex)}
                        sx={{
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'rgba(255,255,255,0.16)',
                          borderRadius: 1,
                          cursor: 'pointer',
                          minHeight: 30,
                          p: 0.25,
                          textAlign: 'left',
                          bgcolor: (theme) => isSelected
                            ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)')
                            : getTimelineColor(theme, 'micro'),
                          color: (theme) => theme.palette.getContrastText(getTimelineColor(theme, 'micro')),
                          boxShadow: isSelected ? 2 : 0,
                          transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Typography variant="caption" component="div" fontWeight={900} noWrap sx={{ lineHeight: 1.05, fontSize: '0.58rem' }}>
                          Micro {weekGroup.weekIndex}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
                  gap: 0.45,
                  alignItems: 'stretch',
                }}
              >
                {weekGroups.map((weekGroup) => {
                  const isSelectedWeek = weekGroup.weekIndex === selectedWeek;

                  return (
                    <Stack
                      key={weekGroup.weekIndex}
                      spacing={0.3}
                      sx={{
                        minHeight: 46,
                        opacity: isSelectedWeek ? 1 : 0.34,
                        transition: 'opacity 160ms ease',
                      }}
                    >
                      {weekGroup.days.map((day) => {
                        const isSaving = savingDayId === String(day.id);
                        const dayLabel = TRAINING_WEEK_DAYS[(day.dayOfWeek || 1) - 1]?.slice(0, 3) || `D${day.dayOfWeek || day.dayIndex}`;
                        const sessionMeta = getSessionMeta(day);

                        return (
                          <Tooltip
                            key={day.id}
                            title={sessionMeta.layoutName || day.name || TRAINING_WEEK_DAYS[day.dayOfWeek - 1] || `Día ${day.dayIndex}`}
                          >
                            <Box
                              component="button"
                              type="button"
                              aria-label={`Editar sesión ${day.name || day.dayIndex} del microciclo ${day.weekIndex}`}
                              onClick={() => {
                                setSelectedWeek(day.weekIndex);
                                setSelectedDay(day);
                              }}
                              disabled={isSaving}
                              sx={{
                                border: '1px solid',
                                borderColor: isSelectedWeek ? 'primary.main' : 'rgba(255,255,255,0.16)',
                                borderRadius: 0.75,
                                cursor: isSaving ? 'progress' : 'pointer',
                                width: '100%',
                                minHeight: 22,
                                px: 0.25,
                                py: 0.07,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                bgcolor: (theme) => getTimelineColor(theme, 'session'),
                                color: (theme) => theme.palette.getContrastText(getTimelineColor(theme, 'session')),
                                opacity: isSaving ? 0.65 : 1,
                                transition: 'filter 160ms ease, transform 160ms ease, border-color 160ms ease',
                                '&:hover': {
                                  filter: 'brightness(1.06)',
                                  transform: 'translateY(-1px)',
                                },
                              }}
                            >
                              <Typography
                                component="span"
                                variant="caption"
                                fontWeight={900}
                                sx={{ display: 'block', lineHeight: 1.02, whiteSpace: 'nowrap', fontSize: '0.55rem' }}
                              >
                                {dayLabel}
                              </Typography>
                              {sessionMeta.layoutName ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    lineHeight: 1.05,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontSize: '0.48rem',
                                    opacity: 0.95,
                                    mt: 0.08,
                                    maxWidth: '100%',
                                  }}
                                >
                                  {sessionMeta.layoutName}
                                </Typography>
                              ) : (
                                <Box component="span" sx={{ display: 'block', height: '0.6rem', mt: 0.08 }} />
                              )}
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  );
                })}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      <SessionEditorDrawer
        open={Boolean(selectedDay)}
        day={selectedDay}
        saving={Boolean(selectedDay && savingDayId === String(selectedDay.id))}
        onClose={() => setSelectedDay(null)}
        onSave={handleSaveSession}
      />
    </Stack>
  );
}

export default PlanningTimeline;
