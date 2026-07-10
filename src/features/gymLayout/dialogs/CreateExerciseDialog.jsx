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
  Typography,
} from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  EXERCISE_CATEGORIES,
  createGymExerciseModel,
  getGymExerciseCategoryColor,
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
  const selectedCategory = useWatch({ control, name: 'category' });
  const selectedColor = getGymExerciseCategoryColor(selectedCategory);

  useEffect(() => {
    reset(createGymExerciseModel(exercise || {}));
  }, [exercise, open, reset]);

  const submit = async (values) => {
    await onSubmit({
      ...values,
      width: Number(values.width || 1),
      height: Number(values.height || 1),
      color: getGymExerciseCategoryColor(values.category),
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
              name="category"
              control={control}
              rules={{ required: 'La categoría es obligatoria.' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Categoría"
                  fullWidth
                  error={Boolean(errors.category)}
                  helperText={errors.category?.message}
                >
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
            <Box sx={{ height: '100%', minHeight: 56, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: selectedColor,
                  border: '2px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Color automático
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {selectedCategory}
                </Typography>
              </Box>
            </Box>
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
