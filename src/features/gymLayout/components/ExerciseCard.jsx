import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import StraightenIcon from '@mui/icons-material/Straighten';
import { getExerciseSizeLabel } from '../models/gymLayoutModels';

function ExerciseCard({
  exercise,
  placed = false,
  compact = false,
  onEdit,
  onDelete,
  onRemoveFromGrid,
}) {
  const color = exercise.color || '#2563EB';

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', exercise.id);
    event.dataTransfer.setData('application/atlas-gym-exercise', JSON.stringify(exercise));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Box
      draggable={!placed}
      onDragStart={!placed ? handleDragStart : undefined}
      sx={(theme) => ({
        height: '100%',
        minHeight: placed ? '100%' : 116,
        p: compact ? 1 : 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: placed ? alpha(color, 0.45) : 'divider',
        bgcolor: placed ? alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.12) : 'background.paper',
        boxShadow: placed ? `inset 0 0 0 1px ${alpha(color, 0.22)}` : 'none',
        cursor: placed ? 'grab' : 'copy',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          borderColor: alpha(color, 0.8),
          boxShadow: `0 10px 24px ${alpha(color, 0.14)}`,
        },
      })}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            mt: 0.65,
            bgcolor: color,
            flex: '0 0 auto',
          }}
        />

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere', lineHeight: 1.2 }}>
            {exercise.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: placed ? 2 : 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {exercise.description}
          </Typography>
        </Box>

        {placed ? (
          <Tooltip title="Mover">
            <DragIndicatorIcon color="action" fontSize="small" />
          </Tooltip>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, flexWrap: 'wrap', rowGap: 0.5 }}>
          <Chip
            icon={<StraightenIcon />}
            label={getExerciseSizeLabel(exercise)}
            size="small"
            variant="outlined"
          />
          {exercise.category ? <Chip label={exercise.category} size="small" /> : null}
        </Stack>

        <Stack direction="row" spacing={0.25}>
          {!placed && onEdit ? (
            <Tooltip title="Editar">
              <IconButton size="small" aria-label="Editar ejercicio" onClick={() => onEdit(exercise)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title={placed ? 'Quitar del plano' : 'Eliminar'}>
            <IconButton
              size="small"
              color="error"
              aria-label={placed ? 'Quitar ejercicio del plano' : 'Eliminar ejercicio'}
              onClick={() => (placed ? onRemoveFromGrid?.(exercise.id) : onDelete?.(exercise))}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

export default ExerciseCard;
