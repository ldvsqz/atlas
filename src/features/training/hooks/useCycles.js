import { useCallback, useEffect, useState } from 'react';
import TrainingService from '../../../../Firebase/trainingService';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';

export const useCycles = (type) => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchCycles = useCallback(async () => {
    try {
      setLoading(true);
      const data = type
        ? await TrainingService.getCyclesByType(type)
        : await TrainingService.getAllCycles();
      setCycles(data);
    } catch (error) {
      console.error('Error loading cycles:', error);
      showSnackbar('Error al cargar los ciclos', 'error');
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, type]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const createCycle = async (cycle) => {
    try {
      setSaving(true);
      await TrainingService.createCycle(cycle);
      showSnackbar('Ciclo creado correctamente', 'success');
      await fetchCycles();
    } catch (error) {
      console.error('Error creating cycle:', error);
      showSnackbar('Error al crear el ciclo', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateCycle = async (cycleId, cycle) => {
    try {
      setSaving(true);
      await TrainingService.updateCycle(cycleId, cycle);
      showSnackbar('Ciclo actualizado correctamente', 'success');
      await fetchCycles();
    } catch (error) {
      console.error('Error updating cycle:', error);
      showSnackbar('Error al actualizar el ciclo', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteCycle = async (cycleId) => {
    try {
      setSaving(true);
      await TrainingService.deleteCycle(cycleId);
      showSnackbar('Ciclo eliminado correctamente', 'success');
      await fetchCycles();
    } catch (error) {
      console.error('Error deleting cycle:', error);
      showSnackbar('Error al eliminar el ciclo', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    cycles,
    loading,
    saving,
    refreshCycles: fetchCycles,
    createCycle,
    updateCycle,
    deleteCycle,
  };
};
