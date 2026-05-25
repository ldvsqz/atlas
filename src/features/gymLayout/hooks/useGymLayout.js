import { useCallback, useEffect, useRef, useState } from 'react';
import GymLayoutService from '../../../../Firebase/gymLayoutService';
import { useSnackbar } from '../../../Components/snackbar/AtlasSnackbar';
import {
  DEFAULT_LAYOUT_ID,
  createGymLayoutModel,
  removeReservedCollisions,
} from '../models/gymLayoutModels';

export const useGymLayout = (layoutId = DEFAULT_LAYOUT_ID) => {
  const [layout, setLayout] = useState(createGymLayoutModel({ id: layoutId }));
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedLayoutIdRef = useRef(null);
  const { showSnackbar } = useSnackbar();

  const fetchLayouts = useCallback(async () => {
    try {
      const data = await GymLayoutService.getLayouts();
      setLayouts(data);
    } catch (error) {
      console.error('Error loading gym layouts:', error);
      setLayouts([]);
    }
  }, []);

  const fetchLayoutById = useCallback(async (nextLayoutId = layoutId) => {
    try {
      setLoading(true);
      const data = await GymLayoutService.getLayout(nextLayoutId);
      setLayout(data);
      await fetchLayouts();
    } catch (error) {
      console.error('Error loading gym layout:', error);
      showSnackbar('Error al cargar el circuito', 'error');
      setLayout(createGymLayoutModel({ id: nextLayoutId }));
    } finally {
      setLoading(false);
    }
  }, [fetchLayouts, layoutId, showSnackbar]);

  useEffect(() => {
    if (loadedLayoutIdRef.current === layoutId) return;
    loadedLayoutIdRef.current = layoutId;
    fetchLayoutById(layoutId);
  }, [fetchLayoutById, layoutId]);

  const updateDraft = (updater) => {
    setLayout((current) => {
      const nextLayout = typeof updater === 'function' ? updater(current) : updater;
      const rows = Number(nextLayout.rows || current.rows);
      const cols = Number(nextLayout.cols || current.cols);
      const items = removeReservedCollisions(nextLayout.items || [], rows, cols);
      const itemIds = new Set(items.map((item) => item.exerciseId));
      const existingOrder = Array.isArray(nextLayout.exerciseOrder) ? nextLayout.exerciseOrder : current.exerciseOrder;
      const exerciseOrder = [
        ...existingOrder.filter((exerciseId) => itemIds.has(exerciseId)),
        ...items.map((item) => item.exerciseId).filter((exerciseId) => !existingOrder.includes(exerciseId)),
      ];

      return {
        ...nextLayout,
        rows,
        cols,
        items,
        exerciseOrder,
        listNotes: nextLayout.listNotes ?? current.listNotes ?? '',
      };
    });
  };

  const saveLayout = async (nextLayout = layout) => {
    try {
      setSaving(true);
      const saved = await GymLayoutService.saveLayout(nextLayout);
      setLayout((current) => ({
        ...current,
        ...saved,
        items: saved.items,
        exerciseOrder: saved.exerciseOrder,
        listNotes: saved.listNotes,
      }));
      await fetchLayouts();
      showSnackbar('Circuito guardado correctamente', 'success');
    } catch (error) {
      console.error('Error saving gym layout:', error);
      showSnackbar('Error al guardar el circuito', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteLayout = async (layoutId) => {
    try {
      setSaving(true);
      await GymLayoutService.deleteLayout(layoutId);
      await fetchLayouts();
      showSnackbar('Circuito eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error deleting gym layout:', error);
      showSnackbar('Error al eliminar el circuito', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    layout,
    layouts,
    loading,
    saving,
    setLayout: updateDraft,
    saveLayout,
    deleteLayout,
    refreshLayout: () => fetchLayoutById(layout.id),
    loadLayout: fetchLayoutById,
  };
};
