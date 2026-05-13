import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CreateExerciseDialog from '../dialogs/CreateExerciseDialog';
import { useExercises } from '../hooks/useExercises';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

function ExerciseCatalog({ exercises, loading, saving, createExercise, updateExercise, deleteExercise }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [search, setSearch] = useState('');

  const filteredExercises = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return exercises;
    return exercises.filter((exercise) =>
      [exercise.name, exercise.category, exercise.equipment, exercise.intensity]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(value))
    );
  }, [exercises, search]);

  const handleSubmit = async (values) => {
    if (editingExercise) {
      await updateExercise(editingExercise.id, values);
    } else {
      await createExercise(values);
    }
  };

  const handleDelete = async () => {
    if (!exerciseToDelete) return;

    try {
      await deleteExercise(exerciseToDelete.id);
      setExerciseToDelete(null);
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingExercise(null);
    setDialogOpen(true);
  };

  const openEditDialog = (exercise) => {
    setEditingExercise(exercise);
    setDialogOpen(true);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Ejercicios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo reutilizable por ID en los bloques de entrenamiento.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <TextField
            size="small"
            label="Buscar"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Nuevo
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <>
          <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
            {filteredExercises.map((exercise) => (
              <Card
                key={exercise.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  width: '100%',
                  overflow: 'visible',
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Typography
                    fontWeight={800}
                    sx={{
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {exercise.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {exercise.description || 'Sin descripción'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Chip
                      label={exercise.category}
                      size="small"
                      variant="outlined"
                    />

                    <Chip
                      label={exercise.intensity}
                      size="small"
                    />

                    <Chip
                      label={exercise.equipment}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>

                <CardActions
                  sx={{
                    px: 1,
                    pb: 1,
                    pt: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <IconButton
                    fullWidth
                    aria-label="Editar ejercicio"
                    onClick={() => openEditDialog(exercise)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      width: '100%',
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    fullWidth
                    aria-label="Eliminar ejercicio"
                    onClick={() => setExerciseToDelete(exercise)}
                    color="error"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      width: '100%',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            ))}

            {!filteredExercises.length && (
              <Paper variant="outlined" sx={{ borderRadius: 1, py: 5, px: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">No hay ejercicios para mostrar.</Typography>
              </Paper>
            )}
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, display: { xs: 'none', sm: 'block' } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Intensidad</TableCell>
                  <TableCell>Equipo</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{exercise.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {exercise.description || 'Sin descripción'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={exercise.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{exercise.intensity}</TableCell>
                    <TableCell>{exercise.equipment}</TableCell>
                    <TableCell align="right">
                      <IconButton aria-label="Editar ejercicio" onClick={() => openEditDialog(exercise)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton aria-label="Eliminar ejercicio" onClick={() => setExerciseToDelete(exercise)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredExercises.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No hay ejercicios para mostrar.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <CreateExerciseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        saving={saving}
        exercise={editingExercise}
      />

      <DeleteConfirmationDialog
        open={Boolean(exerciseToDelete)}
        title="Eliminar ejercicio"
        message={`¿Desea eliminar "${exerciseToDelete?.name || 'este ejercicio'}"? Los ciclos conservarán solo el ID eliminado.`}
        loading={saving}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}

function ExerciseCatalogContainer() {
  const exerciseState = useExercises();
  return <ExerciseCatalog {...exerciseState} />;
}

export { ExerciseCatalog };
export default ExerciseCatalogContainer;
