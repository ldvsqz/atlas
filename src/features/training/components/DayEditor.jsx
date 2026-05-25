import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { BLOCK_LABELS, createEmptyBlock } from '../models/trainingModels';
import { useMicrocycleDays } from '../hooks/useMicrocycleDays';

const normalizeDay = (day) => ({
  ...day,
  weekIndex: Number(day.weekIndex || Math.ceil((day.dayIndex || 1) / 5) || 1),
  dayOfWeek: Number(day.dayOfWeek || ((((day.dayIndex || 1) - 1) % 5) + 1) || 1),
  mainBlock: day.mainBlock || createEmptyBlock(),
  extraBlock: day.extraBlock || createEmptyBlock(),
});

function DayEditor({ cycleId, weeks = 1 }) {
  const { days, loading, savingDayId, updateDay } = useMicrocycleDays(cycleId, weeks);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      days.forEach((day) => {
        if (!nextDrafts[day.id]) {
          nextDrafts[day.id] = normalizeDay(day);
        }
      });
      return nextDrafts;
    });
  }, [days]);

  const updateDraft = (dayId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [dayId]: {
        ...current[dayId],
        [field]: value,
      },
    }));
  };

  const updateBlock = (dayId, blockKey, blockValue) => {
    updateDraft(dayId, blockKey, blockValue);
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
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Este ciclo todavía no tiene días inicializados.
      </Typography>
    );
  }

  const groupedDays = days.reduce((groups, day) => {
    const normalizedDay = normalizeDay(day);
    const weekKey = normalizedDay.weekIndex || 1;
    return {
      ...groups,
      [weekKey]: [...(groups[weekKey] || []), normalizedDay].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    };
  }, {});

  return (
    <Stack spacing={1.5}>
      {Object.entries(groupedDays).map(([weekIndex, weekDays]) => {
        const weekContent = (
          <Stack spacing={1.5}>
            {weekDays.map((day) => {
              const draft = drafts[day.id] || normalizeDay(day);
              const isSaving = savingDayId === String(day.id);

              return (
                <Accordion key={day.id} disableGutters sx={{ borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {draft.name || `Día ${draft.dayIndex}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Microciclo {draft.weekIndex || 1} · Día {draft.dayOfWeek || draft.dayIndex}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2.5}>
                <Box
                    key={BLOCK_LABELS.warmupBlock?.toLowerCase()}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Bloque de {BLOCK_LABELS.warmupBlock?.toLowerCase()}
                    </Typography>
                  </Box>
                <Box
                  key="shadowBlock"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                    {BLOCK_LABELS.shadowBlock}
                  </Typography>
                  <TextField
                    label="Notas sombra"
                    value={draft.shadowBlock?.notes || ''}
                    onChange={(event) => updateBlock(day.id, 'shadowBlock', {
                      ...draft.shadowBlock,
                      notes: event.target.value,
                    })}
                    disabled={isSaving}
                    minRows={2}
                    multiline
                    fullWidth
                  />
                </Box>
                <Box
                  key="mainBlock"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                  }}
                >
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                    {BLOCK_LABELS.mainBlock}
                  </Typography>
                  <TextField
                    label="Notas del bloque principal"
                    value={draft.mainBlock?.notes || ''}
                    onChange={(event) => updateBlock(day.id, 'mainBlock', {
                      ...draft.mainBlock,
                      notes: event.target.value,
                    })}
                    disabled={isSaving}
                    minRows={4}
                    multiline
                    fullWidth
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={(e) => {
                      e.preventDefault();
                      updateDay(day.id, {
                        dayIndex: draft.dayIndex,
                        weekIndex: draft.weekIndex,
                        dayOfWeek: draft.dayOfWeek,
                        name: draft.name,
                        shadowBlock: {
                          notes: draft.shadowBlock?.notes || '',
                          exerciseIds: draft.shadowBlock?.exerciseIds || [],
                        },
                        mainBlock: {
                          notes: draft.mainBlock?.notes || '',
                          exerciseIds: draft.mainBlock?.exerciseIds || [],
                          gymLayoutId: draft.mainBlock?.gymLayoutId || '',
                          gymLayoutName: draft.mainBlock?.gymLayoutName || '',
                        },
                        extraBlock: {
                          notes: draft.extraBlock?.notes || '',
                          exerciseIds: draft.extraBlock?.exerciseIds || [],
                        },
                      });
                    }}
                    disabled={isSaving}
                  >
                    Guardar día
                  </Button>
                </Box>
              </Stack>
            </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        );

        if (Number(weeks) <= 1) {
          return (
            <Box key={weekIndex}>
              <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                Microciclo {weekIndex}
              </Typography>
              {weekContent}
            </Box>
          );
        }

        return (
          <Accordion
            key={weekIndex}
            disableGutters
            sx={{ borderRadius: 1, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={900}>
                  Microciclo {weekIndex}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {weekDays.length} sesiones planificadas
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {weekContent}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

export default DayEditor;
