import { db } from './firebase';
import {
    collection,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    setDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';


const COLLECTION_NAME = 'finances';
const CASHBOX_COLLECTION_NAME = 'monthlyCashboxes';

class FinanceService {
    static #instance;

    static getInstance() {
        if (!FinanceService.#instance) {
            FinanceService.#instance = new FinanceService();
        }
        return FinanceService.#instance;
    }

    constructor() { }

    //add a finance to firebase
    async add(finance) {
        console.info('Adding finance:', finance);
        try {
            const financeRef = collection(db, COLLECTION_NAME);
            const docRef = doc(financeRef);
            const plainFinance = { ...finance, id: docRef.id };
            await setDoc(docRef, plainFinance);
            return plainFinance;
        } catch (error) {
            console.error('Error trying to insert finance:', error);
            throw error;
        }
    }

    async getAll() {
        const financeRef = collection(db, COLLECTION_NAME);
        try {
            const querySnapshot = await getDocs(financeRef);
            const finances = [];
            querySnapshot.forEach((doc) => {
                finances.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return finances;
        } catch (error) {
            console.error('Error al obtener los usuarios:', error);
        }
    }

    async delete(id) {
        const financeRef = doc(db, COLLECTION_NAME, id);
        try {
            await deleteDoc(financeRef);
            console.log('finance deleted successfully');
        } catch (error) {
            console.error('Error trying to delete finance:', error);
        }
    }


    //Update finance data by passing finance ID and new Data
    async update(id, newFinance) {
        console.info('Updating finance:', id);
        const financeRef = doc(db, COLLECTION_NAME, id);
        try {
            const plainFinance = { ...newFinance };
            await updateDoc(financeRef, plainFinance);
        } catch (error) {
            console.error('Error trying to update finance data:', error);
        }
    }

    async getMonthlyCashbox(month) {
        const cashboxRef = doc(db, CASHBOX_COLLECTION_NAME, month);
        try {
            const documentSnapshot = await getDoc(cashboxRef);
            if (!documentSnapshot.exists()) {
                return null;
            }

            return {
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            };
        } catch (error) {
            console.error('Error trying to get monthly cashbox:', error);
            throw error;
        }
    }

    async saveMonthlyCashbox(month, cashbox) {
        const cashboxRef = doc(db, CASHBOX_COLLECTION_NAME, month);
        try {
            const currentCashbox = await getDoc(cashboxRef);
            const payload = {
                ...cashbox,
                month,
                updatedAt: serverTimestamp(),
                ...(currentCashbox.exists() ? {} : { createdAt: serverTimestamp() })
            };

            await setDoc(cashboxRef, payload, { merge: true });
            return { id: month, ...payload };
        } catch (error) {
            console.error('Error trying to save monthly cashbox:', error);
            throw error;
        }
    }
}

export default FinanceService.getInstance();
