import React, { useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import {
  EXERCISE_CATEGORIES,
  EXERCISE_COLORS,
  createGymExerciseModel,
} from '../models/gymLayoutModels';

function CreateExerciseDialog({ open, onClose, onSubmit, saving = false, exercise = null }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: createGymExerciseModel(),
  });

  useEffect(() => {
    reset(createGymExerciseModel(exercise || {}));
  }, [exercise, open, reset]);

  const submit = async (values) => {
    await onSubmit({
      ...values,
      width: Number(values.width),
      height: Number(values.height),
    });
    reset(createGymExerciseModel());
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
              rules={{ required: 'El nombre es obligatorio.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre"
                  autoFocus
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              rules={{ required: 'La descripción es obligatoria.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  minRows={3}
                  multiline
                  fullWidth
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="width"
              control={control}
              rules={{
                required: 'Ancho requerido.',
                min: { value: 1, message: 'Mínimo 1 columna.' },
                max: { value: 3, message: 'Máximo 3 columnas.' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Ancho"
                  fullWidth
                  inputProps={{ min: 1, max: 3 }}
                  error={Boolean(errors.width)}
                  helperText={errors.width?.message || 'Ejemplo: 1'}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="height"
              control={control}
              rules={{
                required: 'Alto requerido.',
                min: { value: 1, message: 'Mínimo 1 fila.' },
                max: { value: 6, message: 'Máximo 6 filas.' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Alto"
                  fullWidth
                  inputProps={{ min: 1, max: 6 }}
                  error={Boolean(errors.height)}
                  helperText={errors.height?.message || 'Ejemplo: 2'}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Categoría" fullWidth>
                  <MenuItem value="">Sin categoría</MenuItem>
                  {EXERCISE_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="color"
              control={control}
              rules={{ required: 'Color requerido.' }}
              render={({ field }) => (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    Color
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={field.value}
                    onChange={(_, value) => value && field.onChange(value)}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                  >
                    {EXERCISE_COLORS.map((color) => (
                      <ToggleButton
                        key={color}
                        value={color}
                        aria-label={`Color ${color}`}
                        sx={{
                          width: 32,
                          height: 32,
                          p: 0,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: field.value === color ? 'text.primary' : 'divider',
                          bgcolor: color,
                          '&:hover': { bgcolor: color },
                        }}
                      />
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Tamaños sugeridos:
              </Typography>
              <Typography variant="body2">Cuerdas 1x1</Typography>
              <Typography variant="body2">Cambios de guardia 1x2</Typography>
            </Stack>
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
