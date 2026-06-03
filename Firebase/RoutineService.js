import { collection, deleteDoc, updateDoc, getDocs, doc, getDoc, addDoc, setDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from "./firebase"



class RoutineService {

    static #instance;

    static getInstance() {
        if (!RoutineService.#instance) {
            RoutineService.#instance = new RoutineService();
        }
        return RoutineService.#instance;
    }

    constructor() { }


    //add a routine to firebase
    async add(routine) {
        try {
            const routineRef = collection(db, 'routine');
            const docRef = doc(routineRef);
            routine['id'] = docRef.id;
            await setDoc(docRef, routine);
        } catch (error) {
            console.error('Error trying to insert routine:', error);
        }
    }


    //get routine data from a single routine by ID
    async get(routineId) {
        const routineRef = doc(db, 'routine', routineId);
        try {
            const documentSnapshot = await getDoc(routineRef);
            if (documentSnapshot.exists()) {
                const routine = {
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                };
                return routine;
            }
        } catch (error) {
            console.error('Error al obtener el usuario:', error);
        }
    }

    //get all routine
    async getAll() {
        const routineRef = collection(db, 'routine');
        try {
            const querySnapshot = await getDocs(routineRef);
            const routine = [];
            querySnapshot.forEach((doc) => {
                routine.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return routine;
        } catch (error) {
            console.error('Error al obtener los usuarios:', error);
        }
    }


    //delete a single routine by ID
    async delete(dni) {
        const routineRef = doc(db, 'routine', dni);
        try {
            await deleteDoc(routineRef);
        } catch (error) {
            console.error('Error trying to delete routine:', error);
        }
    }


    //Update routine data by passing routine ID and new Data
    async update(id, newroutine) {
        const routineRef = doc(db, 'routine', id);
        try {
            await updateDoc(routineRef, newroutine);
        } catch (error) {
            console.error('Error trying to update routine data:', error);
        }
    }

    async getLast(uid) {
        if (!uid) {
            return null
        }
        const routineRef = collection(db, 'routine');
        const routineQuery = await query(routineRef, where('uid', '==', uid), orderBy('date', 'desc'), limit(1));
        const querySnapshot = await getDocs(routineQuery);
        try {
            if (querySnapshot.docs) {
                const documentSnapshot = querySnapshot.docs[0];
                const routine = {
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                };
                return routine;
            }
        } catch (error) {
            return null;
        }
    }

    async getByDni(dni) {
        const routineRef = collection(db, 'routine');
        const query = query(routineRef, where('dni', '==', dni));
        const querySnapshot = await getDocs(query);

        const routine = [];

        querySnapshot.forEach((doc) => {
            if (doc.exists()) {
                routine.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });

        return routine;
    }





}


export default RoutineService.getInstance();



