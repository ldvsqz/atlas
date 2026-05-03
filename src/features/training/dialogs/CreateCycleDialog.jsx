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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { CYCLE_LABELS, CYCLE_TYPES, createCycleModel, validateCycleWeeks } from '../models/trainingModels';

function CreateCycleDialog({ open, onClose, onSubmit, saving = false, type, cycle = null }) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: createCycleModel({ type }),
  });

  const selectedType = useWatch({ control, name: 'type' });

  useEffect(() => {
    reset(cycle || createCycleModel({ type, weeks: type === CYCLE_TYPES.MICRO ? 1 : 4 }));
  }, [cycle, open, reset, type]);

  useEffect(() => {
    if (selectedType === CYCLE_TYPES.MICRO) {
      setValue('weeks', 1, { shouldValidate: true });
    }
  }, [selectedType, setValue]);

  const submit = async (values) => {
    await onSubmit({
      ...values,
      weeks: Number(values.weeks),
    });
    reset(createCycleModel({ type }));
    onClose();
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{cycle ? 'Editar ciclo' : 'Crear ciclo'}</DialogTitle>
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
              name="type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} select label="Tipo" fullWidth disabled={Boolean(cycle)}>
                  {Object.entries(CYCLE_LABELS).map(([value, label]) => (
                    <MenuItem value={value} key={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="weeks"
              control={control}
              rules={{
                required: 'La duración es requerida.',
                validate: (value) => validateCycleWeeks(selectedType, value),
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Semanas"
                  inputProps={{ min: 1 }}
                  disabled={selectedType === CYCLE_TYPES.MICRO}
                  error={Boolean(errors.weeks)}
                  helperText={errors.weeks?.message}
                  fullWidth
                />
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

export default CreateCycleDialog;
