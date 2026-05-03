import { useCallback, useEffect, useState } from 'react';
import TrainingService from '../../../../Firebase/trainingService';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';

export const useMicrocycleDays = (cycleId, weeks = 1, enabled = true) => {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingDayId, setSavingDayId] = useState(null);
  const { showSnackbar } = useSnackbar();

  const fetchDays = useCallback(async () => {
    if (!cycleId || !enabled) return;

    try {
      setLoading(true);
      const data = await TrainingService.getCycleDays(cycleId, weeks);
      setDays(data);
    } catch (error) {
      console.error('Error loading cycle days:', error);
      showSnackbar('Error al cargar los días del ciclo', 'error');
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [cycleId, enabled, showSnackbar, weeks]);

  useEffect(() => {
    fetchDays();
  }, [fetchDays]);

  const updateDay = async (dayId, dayData) => {
    try {
      setSavingDayId(String(dayId));
      await TrainingService.updateCycleDay(cycleId, dayId, dayData);
      showSnackbar('Día actualizado correctamente', 'success');
      await fetchDays();
    } catch (error) {
      console.error('Error updating day:', error);
      showSnackbar('Error al actualizar el día', 'error');
      throw error;
    } finally {
      setSavingDayId(null);
    }
  };

  return {
    days,
    loading,
    savingDayId,
    refreshDays: fetchDays,
    updateDay,
  };
};
