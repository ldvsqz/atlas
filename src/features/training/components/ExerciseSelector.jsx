import React from 'react';
import { Autocomplete, Chip, TextField } from '@mui/material';

function ExerciseSelector({ exercises, value = [], onChange, label = 'Ejercicios', disabled = false }) {
  const selectedExercises = exercises.filter((exercise) => value.includes(exercise.id));

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      disabled={disabled}
      options={exercises}
      value={selectedExercises}
      getOptionLabel={(option) => option?.name || ''}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      onChange={(_, selected) => onChange(selected.map((exercise) => exercise.id))}
      renderTags={(selected, getTagProps) =>
        selected.map((option, index) => (
          <Chip
            label={option.name}
            size="small"
            {...getTagProps({ index })}
            key={option.id}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="Buscar por nombre"
        />
      )}
    />
  );
}

export default ExerciseSelector;
