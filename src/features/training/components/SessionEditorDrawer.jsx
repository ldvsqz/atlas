import React, { useEffect, useMemo, useState } from 'react';
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
import { BLOCK_LABELS, createEmptyBlock, normalizeCycleDay } from '../models/trainingModels';
import { useGymLayout } from '../../gymLayout/hooks/useGymLayout';

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
  saving = false,
  onClose,
  onSave,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [draft, setDraft] = useState(() => normalizeEditableDay(day));
  const { layout, layouts, loading: layoutsLoading } = useGymLayout();
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

  useEffect(() => {
    if (open) {
      setDraft(normalizeEditableDay(day));
    }
  }, [day, open]);

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
      },
      extraBlock: {
        notes: draft.extraBlock?.notes || '',
        exerciseIds: draft.extraBlock?.exerciseIds || [],
      },
    });
  };

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
                </Stack>
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
