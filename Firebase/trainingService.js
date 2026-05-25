import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  createDefaultCycleDays,
  getCycleDayDocId,
  normalizeCycleDay,
} from '../src/features/training/models/trainingModels';

const CYCLES_COLLECTION = 'cycles';
const EXERCISES_COLLECTION = 'exercises';
const DAYS_SUBCOLLECTION = 'days';

const mapDoc = (documentSnapshot) => ({
  id: documentSnapshot.id,
  ...documentSnapshot.data(),
});

const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime() || 0;
};

const sortByCreatedAtDesc = (items) =>
  [...items].sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));

const commitInBatches = async (items, writeItem, batchSize = 450) => {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = writeBatch(db);
    items.slice(index, index + batchSize).forEach((item) => writeItem(batch, item));
    await batch.commit();
  }
};

class TrainingService {
  static #instance;

  static getInstance() {
    if (!TrainingService.#instance) {
      TrainingService.#instance = new TrainingService();
    }
    return TrainingService.#instance;
  }

  async createCycle(cycle) {
    const cycleRef = doc(collection(db, CYCLES_COLLECTION));
    const payload = {
      name: cycle.name.trim(),
      type: cycle.type,
      description: cycle.description?.trim() || '',
      weeks: Number(cycle.weeks),
      parentCycleId: cycle.parentCycleId || '',
      public: cycle.public ?? true,
      startsAt: cycle.startsAt || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(cycleRef, payload);

    await this.initializeCycleDays(cycleRef.id, payload.weeks);

    return { id: cycleRef.id, ...payload };
  }

  async initializeCycleDays(cycleId, weeks = 1) {
    await commitInBatches(createDefaultCycleDays(weeks), (batch, day) => {
      const dayRef = doc(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION, getCycleDayDocId(day));
      batch.set(dayRef, {
        ...day,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  async initializeMicrocycleDays(cycleId) {
    await this.initializeCycleDays(cycleId, 1);
  }

  async getCycle(cycleId) {
    const cycleRef = doc(db, CYCLES_COLLECTION, cycleId);
    const snapshot = await getDoc(cycleRef);
    return snapshot.exists() ? mapDoc(snapshot) : null;
  }

  async getPublicCycle(cycleId) {
    const cycle = await this.getCycle(cycleId);
    if (!cycle?.public) return null;
    return cycle;
  }

  async getCyclesByType(type) {
    const cyclesQuery = query(
      collection(db, CYCLES_COLLECTION),
      where('type', '==', type)
    );
    const snapshot = await getDocs(cyclesQuery);
    return sortByCreatedAtDesc(snapshot.docs.map(mapDoc));
  }

  async getAllCycles() {
    const cyclesQuery = query(collection(db, CYCLES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(cyclesQuery);
    return snapshot.docs.map(mapDoc);
  }

  async updateCycle(cycleId, data) {
    const cycleRef = doc(db, CYCLES_COLLECTION, cycleId);
    const payload = {
      ...data,
      name: data.name?.trim(),
      description: data.description?.trim() || '',
      weeks: Number(data.weeks),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(cycleRef, payload);
    return { id: cycleId, ...payload };
  }

  async deleteCycle(cycleId) {
    const daysSnapshot = await getDocs(collection(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION));
    await commitInBatches(daysSnapshot.docs, (batch, dayDoc) => batch.delete(dayDoc.ref));
    await deleteDoc(doc(db, CYCLES_COLLECTION, cycleId));
  }

  async ensureCycleDays(cycleId, weeks = 1, existingDays = []) {
    const expectedDays = createDefaultCycleDays(weeks);
    const existingIds = new Set(existingDays.flatMap((day) => [day.id, getCycleDayDocId(day)]));
    const missingDays = expectedDays.filter((day) => !existingIds.has(getCycleDayDocId(day)));

    if (!missingDays.length) return;

    await commitInBatches(missingDays, (batch, day) => {
      const dayRef = doc(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION, getCycleDayDocId(day));
      batch.set(dayRef, {
        ...day,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  async getCycleDays(cycleId, weeks = 1) {
    const daysQuery = query(
      collection(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION),
      orderBy('dayIndex', 'asc')
    );
    const snapshot = await getDocs(daysQuery);
    const days = snapshot.docs.map((dayDoc) => normalizeCycleDay(mapDoc(dayDoc)));

    await this.ensureCycleDays(cycleId, weeks, days);

    const legacyDocs = snapshot.docs.filter((dayDoc) => {
      const day = dayDoc.data();
      return Object.prototype.hasOwnProperty.call(day, 'warmupBlock')
        || Object.prototype.hasOwnProperty.call(day, 'notes');
    });

    if (legacyDocs.length) {
      try {
        await commitInBatches(legacyDocs, (batch, dayDoc) => {
          batch.update(dayDoc.ref, {
            warmupBlock: deleteField(),
            notes: deleteField(),
            updatedAt: serverTimestamp(),
          });
        });
      } catch (error) {
        console.warn('No se pudieron limpiar campos antiguos del microciclo:', error);
      }
    }

    if (days.length < createDefaultCycleDays(weeks).length) {
      return this.getCycleDays(cycleId, weeks);
    }

    return days;
  }

  async getPublicCycleDays(cycleId) {
    const daysQuery = query(
      collection(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION),
      orderBy('dayIndex', 'asc')
    );
    const snapshot = await getDocs(daysQuery);
    return snapshot.docs.map((dayDoc) => normalizeCycleDay(mapDoc(dayDoc)));
  }

  async getMicrocycleDays(cycleId) {
    return this.getCycleDays(cycleId, 1);
  }

  async updateCycleDay(cycleId, dayId, dayData) {
    const dayRef = doc(db, CYCLES_COLLECTION, cycleId, DAYS_SUBCOLLECTION, String(dayId));
    const payload = {
      dayIndex: Number(dayData.dayIndex || dayId),
      weekIndex: Number(dayData.weekIndex || 1),
      dayOfWeek: Number(dayData.dayOfWeek || dayData.dayIndex || dayId),
      name: dayData.name || `Día ${dayData.dayIndex || dayId}`,
      shadowBlock: {
        notes: dayData.shadowBlock?.notes || '',
        exerciseIds: dayData.shadowBlock?.exerciseIds || [],
      },
      mainBlock: {
        notes: dayData.mainBlock?.notes || '',
        exerciseIds: dayData.mainBlock?.exerciseIds || [],
        gymLayoutId: dayData.mainBlock?.gymLayoutId || '',
        gymLayoutName: dayData.mainBlock?.gymLayoutName || '',
      },
      extraBlock: {
        notes: dayData.extraBlock?.notes || '',
        exerciseIds: dayData.extraBlock?.exerciseIds || [],
      },
      notes: deleteField(),
      warmupBlock: deleteField(),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(dayRef, payload);
    return { id: String(dayId), ...payload };
  }

  async updateMicrocycleDay(cycleId, dayId, dayData) {
    return this.updateCycleDay(cycleId, dayId, dayData);
  }

  async createExercise(exercise) {
    const exerciseRef = doc(collection(db, EXERCISES_COLLECTION));
    const payload = {
      name: exercise.name.trim(),
      category: exercise.category,
      description: exercise.description?.trim() || '',
      intensity: exercise.intensity,
      equipment: exercise.equipment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(exerciseRef, payload);
    return { id: exerciseRef.id, ...payload };
  }

  async getExercises() {
    const exercisesQuery = query(collection(db, EXERCISES_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(exercisesQuery);
    return snapshot.docs.map(mapDoc);
  }

  async getExercisesByIds(exerciseIds = []) {
    const uniqueIds = [...new Set(exerciseIds.filter(Boolean).map(String))];
    if (!uniqueIds.length) return [];

    const chunks = Array.from({ length: Math.ceil(uniqueIds.length / 10) }, (_, index) =>
      uniqueIds.slice(index * 10, (index + 1) * 10)
    );

    const snapshots = await Promise.all(
      chunks.map((ids) =>
        getDocs(query(collection(db, EXERCISES_COLLECTION), where(documentId(), 'in', ids)))
      )
    );

    return snapshots.flatMap((snapshot) => snapshot.docs.map(mapDoc));
  }

  async updateExercise(exerciseId, data) {
    const exerciseRef = doc(db, EXERCISES_COLLECTION, exerciseId);
    const payload = {
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      updatedAt: serverTimestamp(),
    };
    await updateDoc(exerciseRef, payload);
    return { id: exerciseId, ...payload };
  }

  async deleteExercise(exerciseId) {
    await deleteDoc(doc(db, EXERCISES_COLLECTION, exerciseId));
  }
}

export default TrainingService.getInstance();
