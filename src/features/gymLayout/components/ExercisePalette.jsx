import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExerciseCard from './ExerciseCard';

function ExercisePalette({
  exercises,
  placedExerciseIds = [],
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}) {
  const [search, setSearch] = useState('');
  const placedIds = useMemo(() => new Set(placedExerciseIds), [placedExerciseIds]);

  const availableExercises = useMemo(() => {
    const value = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (placedIds.has(exercise.id)) return false;

      const matchesSearch = !value || [exercise.name, exercise.description, exercise.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(value));

      return matchesSearch;
    });
  }, [exercises, placedIds, search]);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 1,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={900}>
              Ejercicios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Arrastra al plano para colocar.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            Nuevo
          </Button>
        </Stack>

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          label="Buscar ejercicio"
          size="small"
          fullWidth
          sx={{ mt: 2 }}
        />
      </Box>

      <Divider />

      <Stack
        spacing={1.25}
        sx={{
          p: 2,
          overflowY: 'auto',
          minHeight: 260,
          flex: 1,
        }}
      >
        {loading ? (
          <>
            <Skeleton variant="rounded" height={116} />
            <Skeleton variant="rounded" height={116} />
            <Skeleton variant="rounded" height={116} />
          </>
        ) : availableExercises.length ? (
          availableExercises.map((exercise) => (
            <Box key={exercise.id}>
              <ExerciseCard
                exercise={exercise}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </Box>
          ))
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography fontWeight={700}>No hay ejercicios</Typography>
            <Typography variant="body2" color="text.secondary">
              Crea uno para empezar a construir el plano.
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default ExercisePalette;
