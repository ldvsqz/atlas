import React, { useMemo, useState } from 'react';
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
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CycleCard from './CycleCard';
import CreateCycleDialog from '../dialogs/CreateCycleDialog';
import { useCycles } from '../hooks/useCycles';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { CYCLE_LABELS, CYCLE_TYPES } from '../models/trainingModels';
import { buildMainCircuit } from '../utils/mainCircuitBuilder.js';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import TrainingService from '../../../../Firebase/trainingService';
import GymLayoutService from '../../../../Firebase/gymLayoutService';
import dayjs from 'dayjs';

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatCycleDate = (date) => {
  const value = dayjs(date);
  return `${value.date()}.${MONTH_LABELS[value.month()]}.${value.year()}`;
};

const formatCycleDateRange = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (start.year() === end.year() && start.month() === end.month()) {
    return `${start.date()}-${end.date()}.${MONTH_LABELS[end.month()]}.${end.year()}`;
  }

  if (start.year() === end.year()) {
    return `${start.date()}.${MONTH_LABELS[start.month()]}-${end.date()}.${MONTH_LABELS[end.month()]}.${end.year()}`;
  }

  return `${formatCycleDate(start)}-${formatCycleDate(end)}`;
};

const getSessionDate = (startDate, day) =>
  dayjs(startDate).add((Number(day.weekIndex || 1) - 1) * 7 + Number(day.dayOfWeek || 1) - 1, 'day');

const getMesocycleWeeksFromPeriod = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const inclusiveDays = end.diff(start, 'day') + 1;
  return Math.max(1, Math.ceil(inclusiveDays / 7));
};

const getWizardStationCategories = (gymExercises = [], dayIndex = 1) => {
  const categories = [...new Set(gymExercises.map((exercise) => exercise.category).filter(Boolean))].sort();
  if (!categories.length) return [];

  return Array.from({ length: 5 }, (_, index) => {
    const offset = (Number(dayIndex || 1) - 1 + index) % categories.length;
    return categories[offset];
  });
};

function CycleList({ exercises = [] }) {
  const { cycles, loading, saving, createCycle, updateCycle, deleteCycle, refreshCycles } = useCycles();
  const { showSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState(CYCLE_TYPES.MICRO);
  const [wizardObjective, setWizardObjective] = useState('');
  const [wizardStartDate, setWizardStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [wizardEndDate, setWizardEndDate] = useState(dayjs().add(4, 'week').subtract(3, 'day').format('YYYY-MM-DD'));
  const [wizardSaving, setWizardSaving] = useState(false);

  const filteredCycles = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return cycles;

    return cycles.filter((cycle) =>
      [
        cycle.name,
        cycle.description,
        CYCLE_LABELS[cycle.type],
        cycle.type,
        `${cycle.weeks} microciclos`,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [cycles, search]);

  const handleDelete = async () => {
    if (!cycleToDelete) return;

    try {
      await deleteCycle(cycleToDelete.id);
      setCycleToDelete(null);
    } catch (error) {
      console.error('Error deleting cycle:', error);
    }
  };

  const handleSubmit = async (values) => {
    if (editingCycle) {
      await updateCycle(editingCycle.id, values);
    } else {
      await createCycle(values);
    }
  };

  const openCreateDialog = () => {
    setEditingCycle(null);
    setDialogOpen(true);
  };

  const openEditDialog = (cycle) => {
    setEditingCycle(cycle);
    setDialogOpen(true);
  };

  const openGenerateDialog = () => {
    setWizardOpen(true);
  };

  const runWizard = async () => {
    try {
      setWizardSaving(true);
      const gymExercises = await GymLayoutService.getExercises();

      if (!gymExercises.length) {
        showSnackbar('Agrega ejercicios en Circuitos del gimnasio antes de usar el Wizard', 'warning');
        return;
      }

      if (!wizardObjective.trim()) {
        showSnackbar('Indica el objetivo del ciclo', 'warning');
        return;
      }

      const cycleStart = dayjs(wizardStartDate);
      const cycleEnd = wizardType === CYCLE_TYPES.MICRO
        ? cycleStart.add(4, 'day')
        : dayjs(wizardEndDate);

      if (!cycleStart.isValid() || !cycleEnd.isValid() || cycleEnd.isBefore(cycleStart, 'day')) {
        showSnackbar('Selecciona un periodo válido', 'warning');
        return;
      }

      const weeks = wizardType === CYCLE_TYPES.MICRO
        ? 1
        : getMesocycleWeeksFromPeriod(cycleStart, cycleEnd);

      if (wizardType === CYCLE_TYPES.MESO && weeks >= 12) {
        showSnackbar('Un mesociclo debe durar menos de 12 microciclos', 'warning');
        return;
      }

      const cycleName = formatCycleDateRange(cycleStart, cycleEnd);
      const cycleDescription = `Objetivo: ${wizardObjective.trim()}\nAutogenerado.`;
      const generatedCycle = await TrainingService.createCycle({
        name: cycleName,
        type: wizardType,
        description: cycleDescription,
        weeks,
        public: true,
        startsAt: cycleStart.toDate(),
      });
      const days = await TrainingService.getCycleDays(generatedCycle.id, generatedCycle.weeks);

      await Promise.all(days.map((day) => {
        const sessionDate = getSessionDate(cycleStart, day);
        const sessionName = formatCycleDate(sessionDate);
        const stationCategories = getWizardStationCategories(gymExercises, day.dayIndex);
        const mainCircuit = buildMainCircuit({
          stationCategories,
          exercises: gymExercises,
        });
        const circuitName = `Circuito ${sessionName}`;
        const stationExerciseIds = mainCircuit.stations.map((station) => station.exerciseId);
        const hasUniqueStations = new Set(stationExerciseIds).size === stationExerciseIds.length;
        const gymLayoutId = hasUniqueStations ? `wizard-${generatedCycle.id}-${day.id}` : '';

        const saveLayout = hasUniqueStations
          ? GymLayoutService.saveLayout({
            id: gymLayoutId,
            name: circuitName,
            items: mainCircuit.stations.map((station) => ({
              exerciseId: station.exerciseId,
              x: station.gridPosition.x,
              y: station.gridPosition.y,
              w: station.gridPosition.w,
              h: station.gridPosition.h,
            })),
            exerciseOrder: stationExerciseIds,
            listNotes: `${mainCircuit.laps} vueltas · ${mainCircuit.workMinutes} min trabajo · ${mainCircuit.transitionMinutes} min transición`,
          })
          : Promise.resolve();

        return saveLayout.then(() => TrainingService.updateCycleDay(generatedCycle.id, day.id, {
          ...day,
          name: sessionName,
          mainBlock: {
            ...day.mainBlock,
            gymLayoutId,
            gymLayoutName: circuitName,
            mainCircuit,
          },
        }));
      }));

      await refreshCycles();
      setWizardOpen(false);
      setWizardObjective('');
      showSnackbar('Ciclo y circuitos generados correctamente', 'success');
    } catch (error) {
      console.error('Error running planning wizard:', error);
      showSnackbar(error.message || 'No se pudo generar el ciclo con circuitos', 'error');
    } finally {
      setWizardSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Ciclos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra macrociclos, mesociclos y microciclos desde una sola vista.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <TextField
            size="small"
            label="Buscar ciclos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          <Button
            type="button"
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={openGenerateDialog}
            disabled={loading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Wizard
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Nuevo
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item}>
              <Skeleton variant="rounded" height={190} />
            </Grid>
          ))}
        </Grid>
      ) : filteredCycles.length ? (
        <Grid container spacing={2}>
          {filteredCycles.map((cycle) => (
            <Grid item xs={12} md={6} lg={4} key={cycle.id}>
              <CycleCard
                cycle={cycle}
                exercises={exercises}
                onEdit={openEditDialog}
                onDelete={() => setCycleToDelete(cycle)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            py: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            {cycles.length ? 'No hay ciclos para esa búsqueda.' : 'No hay ciclos registrados.'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {cycles.length ? 'Intenta con otro nombre, tipo o duración.' : 'Crea el primero para empezar a planificar.'}
          </Typography>
        </Box>
      )}

      <CreateCycleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        saving={saving}
        cycle={editingCycle}
      />

      <Dialog
        open={wizardOpen}
        onClose={wizardSaving ? undefined : () => setWizardOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Wizard de planificación</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Tipo de ciclo"
              value={wizardType}
              onChange={(event) => {
                const nextType = event.target.value;
                setWizardType(nextType);
                if (nextType === CYCLE_TYPES.MICRO) {
                  setWizardEndDate(dayjs(wizardStartDate).add(4, 'day').format('YYYY-MM-DD'));
                } else {
                  setWizardEndDate(dayjs(wizardStartDate).add(4, 'week').subtract(3, 'day').format('YYYY-MM-DD'));
                }
              }}
              disabled={wizardSaving}
              fullWidth
            >
              <MenuItem value={CYCLE_TYPES.MICRO}>Microciclo</MenuItem>
              <MenuItem value={CYCLE_TYPES.MESO}>Mesociclo</MenuItem>
            </TextField>

            <TextField
              label="Objetivo del ciclo"
              value={wizardObjective}
              onChange={(event) => setWizardObjective(event.target.value)}
              disabled={wizardSaving}
              minRows={2}
              multiline
              fullWidth
            />

            <TextField
              type="date"
              label="Inicio"
              value={wizardStartDate}
              onChange={(event) => {
                setWizardStartDate(event.target.value);
                if (wizardType === CYCLE_TYPES.MICRO) {
                  setWizardEndDate(dayjs(event.target.value).add(4, 'day').format('YYYY-MM-DD'));
                } else {
                  setWizardEndDate(dayjs(event.target.value).add(4, 'week').subtract(3, 'day').format('YYYY-MM-DD'));
                }
              }}
              disabled={wizardSaving}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            {wizardType === CYCLE_TYPES.MESO && (
              <TextField
                type="date"
                label="Fin"
                value={wizardEndDate}
                onChange={(event) => setWizardEndDate(event.target.value)}
                disabled={wizardSaving}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}

            <Typography variant="body2" color="text.secondary">
              Se creará {wizardType === CYCLE_TYPES.MICRO ? `el microciclo ${formatCycleDateRange(wizardStartDate, dayjs(wizardStartDate).add(4, 'day'))}` : `el mesociclo ${formatCycleDateRange(wizardStartDate, wizardEndDate)}`} y cada sesión quedará vinculada con su circuito principal.
            </Typography>

            {wizardSaving && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Generando ciclo y circuitos...
                </Typography>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWizardOpen(false)} disabled={wizardSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={runWizard}
            disabled={wizardSaving}
          >
            Generar ciclo
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(cycleToDelete)}
        title="Eliminar ciclo"
        message={`¿Desea eliminar "${cycleToDelete?.name || 'este ciclo'}" y toda su planificación? Esta acción no se puede deshacer.`}
        loading={saving}
        onClose={() => setCycleToDelete(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}

export default CycleList;
