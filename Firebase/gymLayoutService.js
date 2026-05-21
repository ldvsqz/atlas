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
} from 'firebase/firestore';
import { db } from './firebase';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  DEFAULT_LAYOUT_ID,
  createGymLayoutModel,
  removeReservedCollisions,
} from '../src/features/gymLayout/models/gymLayoutModels';

const GYM_EXERCISES_COLLECTION = 'gymExercises';
const GYM_LAYOUTS_COLLECTION = 'gymLayouts';

const mapDoc = (documentSnapshot) => ({
  id: documentSnapshot.id,
  ...documentSnapshot.data(),
});

class GymLayoutService {
  static #instance;

  static getInstance() {
    if (!GymLayoutService.#instance) {
      GymLayoutService.#instance = new GymLayoutService();
    }
    return GymLayoutService.#instance;
  }

  async getExercises() {
    const exercisesQuery = query(collection(db, GYM_EXERCISES_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(exercisesQuery);
    return snapshot.docs.map(mapDoc);
  }

  async createExercise(exercise) {
    const exerciseRef = doc(collection(db, GYM_EXERCISES_COLLECTION));
    const payload = {
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      width: Number(exercise.width || 1),
      height: Number(exercise.height || 1),
      color: exercise.color,
      category: exercise.category?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(exerciseRef, payload);
    return { id: exerciseRef.id, ...payload };
  }

  async updateExercise(exerciseId, exercise) {
    const exerciseRef = doc(db, GYM_EXERCISES_COLLECTION, exerciseId);
    const payload = {
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      width: Number(exercise.width || 1),
      height: Number(exercise.height || 1),
      color: exercise.color,
      category: exercise.category?.trim() || '',
      updatedAt: serverTimestamp(),
    };

    await updateDoc(exerciseRef, payload);
    return { id: exerciseId, ...payload };
  }

  async deleteExercise(exerciseId) {
    await deleteDoc(doc(db, GYM_EXERCISES_COLLECTION, exerciseId));
  }

  async getLayouts() {
    const layoutsQuery = query(collection(db, GYM_LAYOUTS_COLLECTION), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(layoutsQuery);
    return snapshot.docs.map((layoutDoc) => createGymLayoutModel(mapDoc(layoutDoc)));
  }

  async getLayout(layoutId = DEFAULT_LAYOUT_ID) {
    const layoutRef = doc(db, GYM_LAYOUTS_COLLECTION, layoutId);
    const snapshot = await getDoc(layoutRef);

    if (!snapshot.exists()) {
      return createGymLayoutModel({ id: layoutId });
    }

    return createGymLayoutModel(mapDoc(snapshot));
  }

  async saveLayout(layout) {
    const layoutId = layout.id || DEFAULT_LAYOUT_ID;
    const payload = {
      name: layout.name?.trim() || 'Plano principal',
      rows: DEFAULT_GRID_ROWS,
      cols: DEFAULT_GRID_COLS,
      items: removeReservedCollisions(layout.items, DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS),
      exerciseOrder: Array.isArray(layout.exerciseOrder) ? layout.exerciseOrder.map(String) : [],
      listNotes: layout.listNotes || '',
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, GYM_LAYOUTS_COLLECTION, layoutId),
      {
        ...payload,
        createdAt: layout.createdAt || serverTimestamp(),
      },
      { merge: true }
    );

    return { id: layoutId, ...payload };
  }

  async deleteLayout(layoutId) {
    await deleteDoc(doc(db, GYM_LAYOUTS_COLLECTION, layoutId));
  }
}

export default GymLayoutService.getInstance();
