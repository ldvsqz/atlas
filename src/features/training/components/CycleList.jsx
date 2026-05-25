import React, { useMemo, useState } from 'react';
import { Box, Button, Grid, Skeleton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CycleCard from './CycleCard';
import CreateCycleDialog from '../dialogs/CreateCycleDialog';
import { useCycles } from '../hooks/useCycles';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { CYCLE_LABELS } from '../models/trainingModels';

function CycleList({ exercises = [] }) {
  const { cycles, loading, saving, createCycle, updateCycle, deleteCycle } = useCycles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  const [search, setSearch] = useState('');

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
