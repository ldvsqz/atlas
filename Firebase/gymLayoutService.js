import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentGymId } from './tenant';
import { cachedRequest, invalidateRequests } from './requestCache';
import {
  DEFAULT_LAYOUT_ID,
  createGymLayoutModel,
  getGymExerciseCategoryColor,
  EXERCISE_CATEGORIES,
  formatGymLayoutName,
  removeReservedCollisions,
} from '../src/features/gymLayout/models/gymLayoutModels';

const GYM_EXERCISES_COLLECTION = 'gymExercises';
const GYM_LAYOUTS_COLLECTION = 'gymLayouts';

const mapDoc = (documentSnapshot) => ({
  id: documentSnapshot.id,
  ...documentSnapshot.data(),
});

const resolveGymId = async (gymId) => gymId || getCurrentGymId();

const normalizeExerciseCategory = (category) => (
  EXERCISE_CATEGORIES.includes(category) ? category : EXERCISE_CATEGORIES[0]
);

class GymLayoutService {
  static #instance;

  static getInstance() {
    if (!GymLayoutService.#instance) {
      GymLayoutService.#instance = new GymLayoutService();
    }
    return GymLayoutService.#instance;
  }

  async getExercises(gymIdOverride = null) {
    const gymId = await resolveGymId(gymIdOverride);
    return cachedRequest(`gym-layout:exercises:${gymId}`, async () => {
      const exercisesQuery = query(collection(db, GYM_EXERCISES_COLLECTION), where('gymId', '==', gymId), orderBy('name', 'asc'));
      const snapshot = await getDocs(exercisesQuery);
      return snapshot.docs.map(mapDoc);
    });
  }

  async createExercise(exercise) {
    const exerciseRef = doc(collection(db, GYM_EXERCISES_COLLECTION));
    const gymId = await getCurrentGymId();
    const category = normalizeExerciseCategory(exercise.category);
    const payload = {
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      imageDataUrl: exercise.imageDataUrl || '',
      imageName: exercise.imageName || '',
      width: Number(exercise.width || 1),
      height: Number(exercise.height || 1),
      color: getGymExerciseCategoryColor(category),
      category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      gymId,
    };

    await setDoc(exerciseRef, payload);
    invalidateRequests(`gym-layout:exercises:${gymId}`);
    return { id: exerciseRef.id, ...payload };
  }

  async updateExercise(exerciseId, exercise) {
    const exerciseRef = doc(db, GYM_EXERCISES_COLLECTION, exerciseId);
    const gymId = await getCurrentGymId();
    const category = normalizeExerciseCategory(exercise.category);
    const payload = {
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      imageDataUrl: exercise.imageDataUrl || '',
      imageName: exercise.imageName || '',
      width: Number(exercise.width || 1),
      height: Number(exercise.height || 1),
      color: getGymExerciseCategoryColor(category),
      category,
      updatedAt: serverTimestamp(),
      gymId,
    };

    await updateDoc(exerciseRef, payload);
    invalidateRequests(`gym-layout:exercises:${gymId}`);
    return { id: exerciseId, ...payload };
  }

  async deleteExercise(exerciseId) {
    const gymId = await getCurrentGymId();
    await deleteDoc(doc(db, GYM_EXERCISES_COLLECTION, exerciseId));
    invalidateRequests(`gym-layout:exercises:${gymId}`);
  }

  async getLayouts() {
    const gymId = await getCurrentGymId();
    return cachedRequest(`gym-layout:layouts:${gymId}`, async () => {
      const layoutsQuery = query(collection(db, GYM_LAYOUTS_COLLECTION), where('gymId', '==', gymId), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(layoutsQuery);
      return snapshot.docs.map((layoutDoc) => createGymLayoutModel(mapDoc(layoutDoc)));
    });
  }

  async getLayout(layoutId = DEFAULT_LAYOUT_ID, gymIdOverride = null) {
    const gymId = await resolveGymId(gymIdOverride);
    const layoutRef = doc(db, GYM_LAYOUTS_COLLECTION, layoutId);
    const snapshot = await getDoc(layoutRef);

    if (!snapshot.exists() || snapshot.data().gymId !== gymId) {
      return createGymLayoutModel({ id: layoutId });
    }

    return createGymLayoutModel(mapDoc(snapshot));
  }

  async saveLayout(layout) {
    const gymId = await getCurrentGymId();
    const layoutId = layout.id || DEFAULT_LAYOUT_ID;
    const rows = Math.max(1, Number(layout.rows || 1));
    const cols = Math.max(1, Number(layout.cols || 1));
    const reservedCells = Array.isArray(layout.reservedCells) ? layout.reservedCells : [];
    const payload = {
      name: layout.name?.trim() || formatGymLayoutName(),
      rows,
      cols,
      reservedCells,
      items: removeReservedCollisions(layout.items, rows, cols, reservedCells),
      exerciseOrder: Array.isArray(layout.exerciseOrder) ? layout.exerciseOrder.map(String) : [],
      listNotes: layout.listNotes || '',
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, GYM_LAYOUTS_COLLECTION, layoutId),
      {
        ...payload,
        gymId,
        createdAt: layout.createdAt || serverTimestamp(),
      },
      { merge: true }
    );

    invalidateRequests(`gym-layout:layouts:${gymId}`);
    return { id: layoutId, ...payload };
  }

  async deleteLayout(layoutId) {
    const gymId = await getCurrentGymId();
    await deleteDoc(doc(db, GYM_LAYOUTS_COLLECTION, layoutId));
    invalidateRequests(`gym-layout:layouts:${gymId}`);
  }
}

export default GymLayoutService.getInstance();
