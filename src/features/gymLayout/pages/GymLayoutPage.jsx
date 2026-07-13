import React, { useMemo, useState } from 'react';
import {
  Box,
  Container,
  LinearProgress,
  Stack,
  Typography,
  Button,
  Paper,
  alpha
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import DeleteConfirmationDialog from '../../training/components/DeleteConfirmationDialog';
import ExercisePalette from '../components/ExercisePalette';
import GymGrid from '../components/GymGrid';
import LayoutCatalog from '../components/LayoutCatalog';
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
    deleteLayout,
    loadLayout,
  } = useGymLayout();

  const { showSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [layoutToDelete, setLayoutToDelete] = useState(null);
  const [selectedPaletteExercise, setSelectedPaletteExercise] = useState(null);
  const [viewMode, setViewMode] = useState('catalog');

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

    return order.map((exerciseId) => exercisesById.get(exerciseId)).filter(Boolean);
  }, [exercisesById, layout.exerciseOrder, layout.items]);

  const catalogLayouts = useMemo(() => {
    const knownLayouts = [...layouts];
    if (layout?.id && !knownLayouts.some((savedLayout) => savedLayout.id === layout.id)) {
      knownLayouts.unshift(layout);
    }
    return knownLayouts;
  }, [layout, layouts]);

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
    if (selectedPaletteExercise?.id === exerciseToDelete.id) {
      setSelectedPaletteExercise(null);
    }
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
    if (!exercise) return;

    const nextItem = {
      exerciseId,
      x: position.x,
      y: position.y,
      w: Math.min(Number(exercise.width || 1), layout.cols),
      h: Math.min(Number(exercise.height || 1), layout.rows),
    };

    if (collidesWithReservedCell(nextItem, layout.rows, layout.cols)) {
      showSnackbar('Casilla bloqueada (Baño / Bodega)', 'warning');
      return;
    }

    setLayout((current) => {
      const filtered = current.items.filter((item) => item.exerciseId !== exerciseId);
      const existsInOrder = (current.exerciseOrder || []).includes(exerciseId);
      return {
        ...current,
        items: removeReservedCollisions([...filtered, nextItem], current.rows, current.cols),
        exerciseOrder: existsInOrder ? current.exerciseOrder : [...(current.exerciseOrder || []), exerciseId],
      };
    });
    
    setSelectedPaletteExercise(null);
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

      return { ...current, exerciseOrder: nextOrder };
    });
  };

  const handleListNotesChange = (notes) => {
    setLayout((current) => ({ ...current, listNotes: notes }));
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
    setLayout(createGymLayoutModel({ id: `layout-${Date.now()}`, name: 'Nuevo circuito' }));
    setSelectedPaletteExercise(null);
    setViewMode('editor');
  };

  const handleOpenLayout = async (nextLayout) => {
    setSelectedPaletteExercise(null);
    await loadLayout(nextLayout.id);
    setViewMode('editor');
  };

  const handleDownloadPdf = () => {
    downloadGymLayoutPdf({ layout, exercises, orderedExercises: orderedPlacedExercises });
  };

  const handleDeleteLayout = async () => {
    if (!layoutToDelete) return;
    await deleteLayout(layoutToDelete.id);
    if (layout.id === layoutToDelete.id) {
      setLayout(createGymLayoutModel({ id: `layout-${Date.now()}`, name: 'Nuevo circuito' }));
      setViewMode('catalog');
    }
    setLayoutToDelete(null);
  };

  const loading = exercisesLoading || layoutLoading;

  return (
    <Box sx={{ pb: { xs: 12, lg: 3 } }}>
      {menu}
      {loading ? <LinearProgress /> : null}

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={900} letterSpacing="-0.5px">
                  Plano de distribución de circuito
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Administra circuitos y estaciones del gimnasio.
                </Typography>
              </Box>
              {viewMode === 'editor' && (
                <Button
                  variant="outlined"
                  startIcon={<ViewModuleIcon />}
                  onClick={() => {
                    setSelectedPaletteExercise(null);
                    setViewMode('catalog');
                  }}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                >
                  Ver circuitos
                </Button>
              )}
            </Stack>
          </Box>

          {viewMode === 'catalog' ? (
            <LayoutCatalog
              layouts={catalogLayouts}
              exercises={exercises}
              loading={loading}
              onOpen={handleOpenLayout}
              onCreate={handleNewLayout}
              onDelete={setLayoutToDelete}
            />
          ) : (
            <>
              <LayoutToolbar
                layout={layout}
                placedCount={layout.items.length}
                saving={layoutSaving}
                onChange={setLayout}
                onSave={handleSave}
                onNew={handleNewLayout}
                onClear={handleClearLayout}
                onDownloadPdf={handleDownloadPdf}
              />

              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} alignItems="start">
                <Box sx={{ width: { xs: '100%', lg: 280, xl: 320 }, flexShrink: 0 }}>
                  <ExercisePalette
                    exercises={exercises}
                    placedExerciseIds={placedExerciseIds}
                    loading={exercisesLoading}
                    onCreate={() => { setEditingExercise(null); setDialogOpen(true); }}
                    onEdit={(ex) => { setEditingExercise(ex); setDialogOpen(true); }}
                    onDelete={setExerciseToDelete}
                    selectedExercise={selectedPaletteExercise}
                    onSelectExercise={setSelectedPaletteExercise}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                  <GymGrid
                    layout={layout}
                    exercises={exercises}
                    onLayoutChange={handleLayoutItemsChange}
                    onDropExercise={handleDropExercise}
                    onRemoveExercise={handleRemoveExerciseFromGrid}
                    selectedActiveExercise={selectedPaletteExercise}
                    onSelectExercise={setSelectedPaletteExercise}
                  />
                </Box>

                <Box sx={{ width: { xs: '100%', lg: 340, xl: 380 }, flexShrink: 0 }}>
                  <LayoutExerciseList
                    exercises={orderedPlacedExercises}
                    listNotes={layout.listNotes || ''}
                    onReorder={handleReorderExercise}
                    onListNotesChange={handleListNotesChange}
                  />
                </Box>
              </Stack>
            </>
          )}
        </Stack>
      </Container>

      {/* COMPONENTE DE ACCIÓN INTERACTIVA INFERIOR (Solo visible cuando tienes un ejercicio "en la mano") */}
      {selectedPaletteExercise && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            p: 1.5,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'primary.main',
            width: 'calc(100% - 32px)',
            maxWidth: 400
          }}
        >
          <Typography variant="body2" fontWeight={800} sx={{ flex: 1, noWrap: true, fontSize: 12.5 }}>
            Moviendo: <b>{selectedPaletteExercise.name}</b>
          </Typography>
          <Button
            size="small"
            color="error"
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={() => setSelectedPaletteExercise(null)}
            sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 11 }}
          >
            Cancelar
          </Button>
        </Paper>
      )}

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
        message={`¿Desea eliminar totalmente del sistema a "${exerciseToDelete?.name || 'este ejercicio'}"?`}
        loading={exerciseSaving}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDeleteExercise}
      />

      <DeleteConfirmationDialog
        open={Boolean(layoutToDelete)}
        title="Eliminar circuito"
        message={`¿Desea eliminar "${layoutToDelete?.name || 'este circuito'}"? Esta acción no se puede deshacer.`}
        loading={layoutSaving}
        onClose={() => setLayoutToDelete(null)}
        onConfirm={handleDeleteLayout}
      />
    </Box>
  );
}

export default GymLayoutPage;
