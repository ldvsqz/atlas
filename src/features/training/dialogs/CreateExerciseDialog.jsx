import React, { useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import {
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORIES,
  INTENSITY_LEVELS,
  createExerciseModel,
} from '../models/trainingModels';

function CreateExerciseDialog({ open, onClose, onSubmit, saving = false, exercise = null }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: createExerciseModel(),
  });

  useEffect(() => {
    reset(exercise || createExerciseModel());
  }, [exercise, open, reset]);

  const submit = async (values) => {
    await onSubmit(values);
    reset(createExerciseModel());
    onClose();
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{exercise ? 'Editar ejercicio' : 'Crear ejercicio'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid item xs={12}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'El nombre es requerido.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre"
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  fullWidth
                  autoFocus
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="category"
              control={control}
              rules={{ required: 'La categoría es requerida.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Categoría"
                  error={Boolean(errors.category)}
                  helperText={errors.category?.message}
                  fullWidth
                >
                  {EXERCISE_CATEGORIES.map((category) => (
                    <MenuItem value={category} key={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="intensity"
              control={control}
              rules={{ required: 'La intensidad es requerida.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Intensidad"
                  error={Boolean(errors.intensity)}
                  helperText={errors.intensity?.message}
                  fullWidth
                >
                  {INTENSITY_LEVELS.map((intensity) => (
                    <MenuItem value={intensity} key={intensity}>
                      {intensity}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="equipment"
              control={control}
              rules={{ required: 'El equipo es requerido.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Equipo"
                  error={Boolean(errors.equipment)}
                  helperText={errors.equipment?.message}
                  fullWidth
                >
                  {EQUIPMENT_OPTIONS.map((equipment) => (
                    <MenuItem value={equipment} key={equipment}>
                      {equipment}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  minRows={3}
                  multiline
                  fullWidth
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(submit)}
          disabled={saving}
          startIcon={saving ? <CircularProgress color="inherit" size={16} /> : null}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateExerciseDialog;
