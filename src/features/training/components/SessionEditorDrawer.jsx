import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MapIcon from '@mui/icons-material/Map';
import { BLOCK_LABELS, createEmptyBlock, normalizeCycleDay } from '../models/trainingModels';
import { useGymLayout } from '../../gymLayout/hooks/useGymLayout';
import { useGymExercises } from '../../gymLayout/hooks/useGymExercises';
import { buildMainCircuit, MAIN_CIRCUIT_STATION_COUNT } from '../utils/mainCircuitBuilder.js';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';

const normalizeEditableDay = (day) => {
  if (!day) return null;
  const normalizedDay = normalizeCycleDay(day);

  return {
    ...normalizedDay,
    shadowBlock: {
      ...createEmptyBlock(),
      ...normalizedDay.shadowBlock,
    },
    mainBlock: {
      ...createEmptyBlock(),
      ...normalizedDay.mainBlock,
    },
    extraBlock: {
      ...createEmptyBlock(),
      ...normalizedDay.extraBlock,
    },
  };
};

function SessionEditorDrawer({
  open,
  day,
  focusGenerator = false,
  saving = false,
  onClose,
  onSave,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const generatorRef = useRef(null);
  const [draft, setDraft] = useState(() => normalizeEditableDay(day));
  const [stationCategories, setStationCategories] = useState([]);
  const { layout, layouts, loading: layoutsLoading } = useGymLayout();
  const { exercises: gymExercises, loading: gymExercisesLoading } = useGymExercises();
  const { showSnackbar } = useSnackbar();
  const gymExerciseCategories = useMemo(
    () => [...new Set(gymExercises.map((exercise) => exercise.category).filter(Boolean))].sort(),
    [gymExercises]
  );
  const exerciseMap = useMemo(() => Object.fromEntries(
    gymExercises.map((exercise) => [String(exercise.id), exercise])
  ), [gymExercises]);
  const layoutOptions = useMemo(() => {
    const options = [...layouts];

    if (layout?.id && !options.some((savedLayout) => savedLayout.id === layout.id)) {
      options.unshift(layout);
    }

    const linkedLayoutId = draft?.mainBlock?.gymLayoutId;
    if (linkedLayoutId && !options.some((savedLayout) => savedLayout.id === linkedLayoutId)) {
      options.unshift({
        id: linkedLayoutId,
        name: draft.mainBlock?.gymLayoutName || 'Circuito vinculado',
      });
    }

    return options;
  }, [draft?.mainBlock?.gymLayoutId, draft?.mainBlock?.gymLayoutName, layout, layouts]);

  const selectedLinkedLayout = useMemo(() => {
    if (!draft?.mainBlock?.gymLayoutId) return null;
    return layoutOptions.find((option) => option.id === draft.mainBlock.gymLayoutId) || null;
  }, [draft?.mainBlock?.gymLayoutId, layoutOptions]);

  const hasLinkedMainCircuit = Boolean(draft?.mainBlock?.gymLayoutId);

  const circuitSummary = useMemo(() => {
    const layoutName = draft?.mainBlock?.gymLayoutName || selectedLinkedLayout?.name || 'Circuito vinculado';
    const layoutNotes = selectedLinkedLayout ? selectedLinkedLayout.listNotes || '' : draft?.mainBlock?.notes || '';

    if (selectedLinkedLayout) {
      const items = Array.isArray(selectedLinkedLayout.items) ? selectedLinkedLayout.items : [];
      const visibleItems = items
        .slice(0, 4)
        .map((item) => exerciseMap[String(item.exerciseId)]?.name || 'Ejercicio sin nombre')
        .filter(Boolean);

      return {
        type: 'linked',
        name: layoutName,
        summary: `${items.length} ejercicio${items.length === 1 ? '' : 's'} · ${selectedLinkedLayout.rows || 6}x${selectedLinkedLayout.cols || 3}`,
        details: visibleItems,
        notes: layoutNotes,
      };
    }

    if (hasLinkedMainCircuit) {
      return {
        type: 'linked',
        name: layoutName,
        summary: 'Circuito vinculado sin detalles cargados.',
        details: [],
        notes: '',
      };
    }

    if (draft?.mainBlock?.mainCircuit?.stations?.length) {
      const stations = draft.mainBlock.mainCircuit.stations;
      const visibleStations = stations
        .slice(0, 4)
        .map((station) => exerciseMap[String(station.exerciseId)]?.name || station.label || 'Estación')
        .filter(Boolean);

      return {
        type: 'generated',
        name: layoutName || 'Circuito generado',
        summary: `${stations.length} estaciones · ${draft.mainBlock.mainCircuit.laps || 0} vueltas · ${draft.mainBlock.mainCircuit.workMinutes || 0} min`,
        details: visibleStations,
        notes: layoutNotes,
      };
    }

    return {
      type: 'none',
      name: 'Sin circuito asignado',
      summary: 'Elige un circuito vinculado o genera uno para esta sesión.',
      details: [],
      notes: '',
    };
  }, [draft?.mainBlock?.gymLayoutName, draft?.mainBlock?.mainCircuit, draft?.mainBlock?.notes, exerciseMap, hasLinkedMainCircuit, selectedLinkedLayout]);

  useEffect(() => {
    if (open) {
      setDraft(normalizeEditableDay(day));
    }
  }, [day, open]);

  useEffect(() => {
    if (!open || !focusGenerator) return;

    window.setTimeout(() => {
      generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [focusGenerator, open]);

  useEffect(() => {
    if (!open) return;

    const currentCategories = day?.mainBlock?.mainCircuit?.stations?.map((station) => station.category).filter(Boolean) || [];
    const fallbackCategories = Array.from({ length: MAIN_CIRCUIT_STATION_COUNT }, (_, index) =>
      gymExerciseCategories[index % Math.max(gymExerciseCategories.length, 1)] || ''
    );

    setStationCategories(
      Array.from({ length: MAIN_CIRCUIT_STATION_COUNT }, (_, index) =>
        currentCategories[index] || fallbackCategories[index] || ''
      )
    );
  }, [day, gymExerciseCategories, open]);

  const updateBlock = (blockKey, blockValue) => {
    setDraft((current) => ({
      ...current,
      [blockKey]: {
        ...createEmptyBlock(),
        ...blockValue,
      },
    }));
  };

  const handleSave = async () => {
    if (!draft) return;

    await onSave({
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
        mainCircuit: draft.mainBlock?.mainCircuit || null,
      },
      extraBlock: {
        notes: draft.extraBlock?.notes || '',
        exerciseIds: draft.extraBlock?.exerciseIds || [],
      },
    });
  };

  const updateStationCategory = (index, category) => {
    setStationCategories((current) => {
      const nextCategories = [...current];
      nextCategories[index] = category;
      return nextCategories;
    });
  };

  const handleGenerateCircuit = () => {
    if (!draft) return;

    try {
      const mainCircuit = buildMainCircuit({
        stationCategories,
        exercises: gymExercises,
      });

      updateBlock('mainBlock', {
        ...draft.mainBlock,
        mainCircuit,
        gymLayoutId: '',
        gymLayoutName: 'Circuito generado',
      });
      showSnackbar('Circuito principal generado. Guarda la sesión para conservarlo.', 'success');
    } catch (error) {
      console.error('Error generating main circuit:', error);
      showSnackbar(error.message || 'No se pudo generar el circuito principal', 'error');
    }
  };

  const generatedStationCount = draft?.mainBlock?.mainCircuit?.stations?.length || 0;

  return (
    <Drawer
      anchor={fullScreen ? 'bottom' : 'right'}
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        sx: {
          width: fullScreen ? '100%' : 520,
          maxWidth: '100%',
          maxHeight: fullScreen ? '94vh' : '100%',
          borderTopLeftRadius: fullScreen ? 8 : 0,
          borderTopRightRadius: fullScreen ? 8 : 0,
          bgcolor: 'background.default',
        },
      }}
    >
      <Stack sx={{ height: '100%', minHeight: 0 }}>
        <Box sx={{ px: 2.5, pt: fullScreen ? 1 : 2.5, pb: 2 }}>
          {fullScreen && (
            <Box
              sx={{
                width: 44,
                height: 4,
                borderRadius: 1,
                bgcolor: 'divider',
                mx: 'auto',
                mb: 1.5,
              }}
            />
          )}
          <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
                {draft?.name || 'Sesión'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Microciclo {draft?.weekIndex || 1} · Día {draft?.dayOfWeek || draft?.dayIndex || 1}
              </Typography>
            </Box>
            <Tooltip title="Cerrar sin guardar">
              <span>
                <IconButton
                  aria-label="Cerrar sin guardar"
                  onClick={onClose}
                  disabled={saving}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    flexShrink: 0,
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <Divider />

        {draft ? (
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 1.5, sm: 2.5 } }}>
            <Stack spacing={1.5}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  p: { xs: 1.5, sm: 2 },
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                  {BLOCK_LABELS.shadowBlock}
                </Typography>
                <TextField
                  label="Notas sombra"
                  value={draft.shadowBlock?.notes || ''}
                  onChange={(event) => updateBlock('shadowBlock', {
                    ...draft.shadowBlock,
                    notes: event.target.value,
                  })}
                  disabled={saving}
                  minRows={2}
                  multiline
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  p: { xs: 1.5, sm: 2 },
                }}
              >
                <Typography variant="overline" color="text.secondary">
                  {BLOCK_LABELS.mainBlock}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {hasLinkedMainCircuit && (
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.25,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={800}>
                            Circuito asignado
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {circuitSummary.summary}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate('/gym-layout', { state: { layoutId: selectedLinkedLayout?.id } })}
                          disabled={!selectedLinkedLayout?.id || saving}
                        >
                          Editar
                        </Button>
                      </Stack>

                      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
                        {circuitSummary.name}
                      </Typography>

                      {circuitSummary.details.length > 0 && (
                        <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                          {circuitSummary.details.map((detail) => (
                            <Typography key={detail} variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                              • {detail}
                            </Typography>
                          ))}
                        </Stack>
                      )}

                      {circuitSummary.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, overflowWrap: 'anywhere' }}>
                          {circuitSummary.notes}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <TextField
                    select
                    label="Circuito vinculado"
                    value={draft.mainBlock?.gymLayoutId || ''}
                    onChange={(event) => {
                      const selectedLayout = layoutOptions.find((option) => option.id === event.target.value);
                      updateBlock('mainBlock', {
                        ...draft.mainBlock,
                        gymLayoutId: selectedLayout?.id || '',
                        gymLayoutName: selectedLayout?.name || '',
                      });
                    }}
                    disabled={saving || layoutsLoading}
                    fullWidth
                  >
                    <MenuItem value="">Sin circuito vinculado</MenuItem>
                    {layoutOptions.map((layout) => (
                      <MenuItem key={layout.id} value={layout.id}>
                        {layout.name || 'Circuito sin nombre'}
                      </MenuItem>
                    ))}
                  </TextField>
                  {!hasLinkedMainCircuit && (
                    <TextField
                      label="Notas del bloque principal"
                      value={draft.mainBlock?.notes || ''}
                      onChange={(event) => updateBlock('mainBlock', {
                        ...draft.mainBlock,
                        notes: event.target.value,
                      })}
                      disabled={saving}
                      minRows={5}
                      multiline
                      fullWidth
                    />
                  )}
                </Stack>
              </Box>

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  p: { xs: 1.5, sm: 2 },
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                  {BLOCK_LABELS.extraBlock}
                </Typography>
                <TextField
                  label="Notas del bloque extra"
                  value={draft.extraBlock?.notes || ''}
                  onChange={(event) => updateBlock('extraBlock', {
                    ...draft.extraBlock,
                    notes: event.target.value,
                  })}
                  disabled={saving}
                  minRows={3}
                  multiline
                  fullWidth
                />
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">
              Selecciona una sesión para editarla.
            </Typography>
          </Box>
        )}

        <Divider />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            bgcolor: 'background.paper',
          }}
        >
          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            fullWidth
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || !draft}
          >
            Guardar sesión
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

export default SessionEditorDrawer;
