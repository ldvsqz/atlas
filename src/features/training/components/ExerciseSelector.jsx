import React, { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

function SortableItem({ exercise, index, disabled, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      disableGutters
      style={style}
      sx={{
        display: 'block',
        mb: 0.75,
        p: 0,
        '&:last-of-type': { mb: 0 },
      }}
    >
      <Box
        sx={{
          alignItems: 'center',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          border: '1px solid',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderRadius: 1,
          boxShadow: isDragging ? 2 : 'none',
          display: 'grid',
          gap: 0.75,
          gridTemplateColumns: '36px minmax(0, 1fr) 36px',
          minHeight: 44,
          px: 0.75,
          py: 0.5,
          width: '100%',
        }}
      >
        <Tooltip title="Arrastrar para reordenar">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              sx={{
                cursor: disabled ? 'default' : 'grab',
                touchAction: 'none',
                '&:active': { cursor: disabled ? 'default' : 'grabbing' },
              }}
              {...attributes}
              {...listeners}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <ListItemText
          primary={exercise.name}
          primaryTypographyProps={{
            fontWeight: 600,
            noWrap: true,
            title: exercise.name,
          }}
          sx={{ minWidth: 0, my: 0 }}
        />
        <Tooltip title="Quitar ejercicio">
          <span>
            <IconButton
              size="small"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </ListItem>
  );
}

function ExerciseSelector({ exercises, value = [], onChange, label = 'Ejercicios', disabled = false }) {
  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const selectedExercises = value
    .map((exerciseId) => exerciseById.get(exerciseId))
    .filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id);
      const newIndex = value.indexOf(over.id);

      onChange(arrayMove(value, oldIndex, newIndex));
    }
  };

  const removeExercise = (index) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Stack spacing={2}>
      <Autocomplete
        multiple
        disableCloseOnSelect
        disabled={disabled}
        options={exercises}
        value={selectedExercises}
        getOptionLabel={(option) => option?.name || ''}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        filterSelectedOptions
        onChange={(_, selected) => onChange(selected.map((exercise) => exercise.id))}
        renderTags={() => null}
        fullWidth
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder="Buscar por nombre"
          />
        )}
      />

      {selectedExercises.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            bgcolor: 'background.default',
            borderRadius: 1,
            p: { xs: 1, sm: 1.25 },
          }}
        >
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              gap: 1,
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Orden de ejercicios
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedExercises.length} seleccionados
            </Typography>
          </Box>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={value}
              strategy={verticalListSortingStrategy}
            >
              <List dense disablePadding sx={{ overflow: 'hidden' }}>
                {selectedExercises.map((exercise, index) => (
                  <SortableItem
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    disabled={disabled}
                    onRemove={removeExercise}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>
        </Paper>
      )}
    </Stack>
  );
}

export default ExerciseSelector;
