import React, { useMemo, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import DeleteConfirmationDialog from '../../training/components/DeleteConfirmationDialog';
import ExercisePalette from '../components/ExercisePalette';
import GymGrid from '../components/GymGrid';
import LayoutExerciseList from '../components/LayoutExerciseList';
import LayoutToolbar from '../components/LayoutToolbar';
import CreateExerciseDialog from '../dialogs/CreateExerciseDialog';
import { useGymExercises } from '../hooks/useGymExercises';
import { useGymLayout } from '../hooks/useGymLayout';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  createGymLayoutModel,
  collidesWithReservedCell,
  removeReservedCollisions,
} from '../models/gymLayoutModels';
import { downloadGymLayoutPdf } from '../utils/downloadGymLayoutPdf';

function GymLayoutPage({ menu }) {
  const {
    exercises,
    loading: exercisesLoading,
    saving: exerciseSaving,
    createExercise,
    updateExercise,
    deleteExercise,
  } = useGymExercises();

  const {
    layout,
    layouts,
    loading: layoutLoading,
    saving: layoutSaving,
    setLayout,
    saveLayout,
    loadLayout,
  } = useGymLayout();

  const { showSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  const placedExerciseIds = useMemo(
    () => layout.items.map((item) => item.exerciseId),
    [layout.items]
  );

  const exerciseIds = useMemo(
    () => new Set(exercises.map((exercise) => exercise.id)),
    [exercises]
  );

  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const orderedPlacedExercises = useMemo(() => {
    const placedIds = layout.items.map((item) => item.exerciseId);
    const order = [
      ...(layout.exerciseOrder || []).filter((exerciseId) => placedIds.includes(exerciseId)),
      ...placedIds.filter((exerciseId) => !(layout.exerciseOrder || []).includes(exerciseId)),
    ];

    return order
      .map((exerciseId) => exercisesById.get(exerciseId))
      .filter(Boolean);
  }, [exercisesById, layout.exerciseOrder, layout.items]);

  const handleExerciseSubmit = async (values) => {
    if (editingExercise) {
      await updateExercise(editingExercise.id, values);
      setLayout((current) => ({
        ...current,
        items: removeReservedCollisions(
          current.items.map((item) => (
            item.exerciseId === editingExercise.id
              ? { ...item, w: Number(values.width || item.w), h: Number(values.height || item.h) }
              : item
          )),
          current.rows,
          current.cols
        ),
      }));
      return;
    }

    await createExercise(values);
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    await deleteExercise(exerciseToDelete.id);
    setLayout((current) => ({
      ...current,
      items: current.items.filter((item) => item.exerciseId !== exerciseToDelete.id),
      exerciseOrder: (current.exerciseOrder || []).filter((itemId) => itemId !== exerciseToDelete.id),
    }));
    setExerciseToDelete(null);
  };

  const handleLayoutItemsChange = (items) => {
    setLayout((current) => ({
      ...current,
      items: removeReservedCollisions(items, current.rows, current.cols),
    }));
  };

  const handleDropExercise = (exerciseId, position) => {
    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      showSnackbar('No se encontró el ejercicio arrastrado', 'error');
      return;
    }

    if (layout.items.some((item) => item.exerciseId === exerciseId)) {
      showSnackbar('Ese ejercicio ya está colocado en el plano', 'warning');
      return;
    }

    const nextItem = {
      exerciseId,
      x: position.x,
      y: position.y,
      w: Math.min(Number(exercise.width || position.w || 1), layout.cols),
      h: Math.min(Number(exercise.height || position.h || 1), layout.rows),
    };

    if (collidesWithReservedCell(nextItem, layout.rows, layout.cols)) {
      showSnackbar('Esa casilla está bloqueada: baño o bodega', 'warning');
      return;
    }

    setLayout((current) => ({
      ...current,
      items: removeReservedCollisions([...current.items, nextItem], current.rows, current.cols),
      exerciseOrder: [...(current.exerciseOrder || []), exerciseId],
    }));
  };

  const handleRemoveExerciseFromGrid = (exerciseId) => {
    setLayout((current) => ({
      ...current,
      items: current.items.filter((item) => item.exerciseId !== exerciseId),
      exerciseOrder: (current.exerciseOrder || []).filter((itemId) => itemId !== exerciseId),
    }));
  };

  const handleReorderExercise = (sourceExerciseId, targetExerciseId) => {
    setLayout((current) => {
      const placedIds = current.items.map((item) => item.exerciseId);
      const order = [
        ...(current.exerciseOrder || []).filter((itemId) => placedIds.includes(itemId)),
        ...placedIds.filter((itemId) => !(current.exerciseOrder || []).includes(itemId)),
      ];
      const sourceIndex = order.indexOf(sourceExerciseId);
      const targetIndex = order.indexOf(targetExerciseId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;

      const nextOrder = [...order];
      const [movedExerciseId] = nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, movedExerciseId);

      return {
        ...current,
        exerciseOrder: nextOrder,
      };
    });
  };

  const handleListNotesChange = (notes) => {
    setLayout((current) => ({
      ...current,
      listNotes: notes,
    }));
  };

  const handleSave = async () => {
    const cleanedLayout = {
      ...layout,
      rows: DEFAULT_GRID_ROWS,
      cols: DEFAULT_GRID_COLS,
      items: removeReservedCollisions(
        layout.items.filter((item) => exerciseIds.has(item.exerciseId)),
        DEFAULT_GRID_ROWS,
        DEFAULT_GRID_COLS
      ),
      exerciseOrder: orderedPlacedExercises.map((exercise) => exercise.id),
    };

    await saveLayout(cleanedLayout);
  };

  const handleClearLayout = () => {
    setLayout((current) => ({ ...current, items: [], exerciseOrder: [] }));
  };

  const handleNewLayout = () => {
    setLayout(createGymLayoutModel({
      id: `layout-${Date.now()}`,
      name: 'Nuevo plano',
    }));
  };

  const handleDownloadPdf = () => {
    downloadGymLayoutPdf({
      layout,
      exercises,
      orderedExercises: orderedPlacedExercises,
    });
  };

  const openCreateDialog = () => {
    setEditingExercise(null);
    setDialogOpen(true);
  };

  const openEditDialog = (exercise) => {
    setEditingExercise(exercise);
    setDialogOpen(true);
  };

  const loading = exercisesLoading || layoutLoading;

  return (
    <Box>
      {menu}

      {loading ? <LinearProgress /> : null}

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" fontWeight={900}>
              Plano del gimnasio
            </Typography>
            <Typography color="text.secondary">
              Editor visual tipo Battleship para organizar estaciones, ejercicios y zonas de trabajo.
            </Typography>
          </Box>

          <LayoutToolbar
            layout={layout}
            layouts={layouts}
            placedCount={layout.items.length}
            saving={layoutSaving}
            onChange={setLayout}
            onLoad={loadLayout}
            onSave={handleSave}
            onNew={handleNewLayout}
            onClear={handleClearLayout}
            onDownloadPdf={handleDownloadPdf}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={3}>
              <ExercisePalette
                exercises={exercises}
                placedExerciseIds={placedExerciseIds}
                loading={exercisesLoading}
                onCreate={openCreateDialog}
                onEdit={openEditDialog}
                onDelete={setExerciseToDelete}
              />
            </Grid>

            <Grid item xs={12} lg={5}>
              <GymGrid
                layout={layout}
                exercises={exercises}
                onLayoutChange={handleLayoutItemsChange}
                onDropExercise={handleDropExercise}
                onRemoveExercise={handleRemoveExerciseFromGrid}
              />
            </Grid>

            <Grid item xs={12} lg={4}>
              <LayoutExerciseList
                exercises={orderedPlacedExercises}
                listNotes={layout.listNotes || ''}
                onReorder={handleReorderExercise}
                onListNotesChange={handleListNotesChange}
              />
            </Grid>
          </Grid>
        </Stack>
      </Container>

      <CreateExerciseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleExerciseSubmit}
        saving={exerciseSaving}
        exercise={editingExercise}
      />

      <DeleteConfirmationDialog
        open={Boolean(exerciseToDelete)}
        title="Eliminar ejercicio"
        message={`¿Desea eliminar "${exerciseToDelete?.name || 'este ejercicio'}"? También se quitará del plano actual.`}
        loading={exerciseSaving}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDeleteExercise}
      />
    </Box>
  );
}

export default GymLayoutPage;
