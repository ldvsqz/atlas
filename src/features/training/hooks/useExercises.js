import { useCallback, useEffect, useState } from 'react';
import TrainingService from '../../../../Firebase/trainingService';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';

export const useExercises = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const data = await TrainingService.getExercises();
      setExercises(data);
    } catch (error) {
      console.error('Error loading exercises:', error);
      showSnackbar('Error al cargar ejercicios', 'error');
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const createExercise = async (exercise) => {
    try {
      setSaving(true);
      await TrainingService.createExercise(exercise);
      showSnackbar('Ejercicio creado correctamente', 'success');
      await fetchExercises();
    } catch (error) {
      console.error('Error creating exercise:', error);
      showSnackbar('Error al crear el ejercicio', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateExercise = async (exerciseId, exercise) => {
    try {
      setSaving(true);
      await TrainingService.updateExercise(exerciseId, exercise);
      showSnackbar('Ejercicio actualizado correctamente', 'success');
      await fetchExercises();
    } catch (error) {
      console.error('Error updating exercise:', error);
      showSnackbar('Error al actualizar el ejercicio', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async (exerciseId) => {
    try {
      setSaving(true);
      await TrainingService.deleteExercise(exerciseId);
      showSnackbar('Ejercicio eliminado correctamente', 'success');
      await fetchExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      showSnackbar('Error al eliminar el ejercicio', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    exercises,
    loading,
    saving,
    refreshExercises: fetchExercises,
    createExercise,
    updateExercise,
    deleteExercise,
  };
};
