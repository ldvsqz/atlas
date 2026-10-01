import { collection, deleteDoc, updateDoc, getDocs, doc, getDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { db } from "./firebase"
import { DEFAULT_GYM_ID } from './tenant';
import { cachedRequest, invalidateRequests } from './requestCache';

const COLLECTION_NAME = 'users';
const hasGymAssignment = (user) => typeof user?.gymId === 'string' && user.gymId.trim().length > 0;
const GENERATED_EMAIL_DOMAIN = 'members.atlas.invalid';

export const generateMemberProfileEmail = (uid) => `member-${uid}@${GENERATED_EMAIL_DOMAIN}`;
export const isGeneratedMemberProfileEmail = (email) => String(email || '').endsWith(`@${GENERATED_EMAIL_DOMAIN}`);

class UserService {

    static #instance;

    static getInstance() {
        if (!UserService.#instance) {
            UserService.#instance = new UserService();
        }
        return UserService.#instance;
    }

    constructor() { }


    //add a user to firebase
    async add(user) {
        const userRef = doc(db, COLLECTION_NAME, user.uid);
        const userData = { ...user, gymId: user.gymId }; // Convert UserModel object to plain JavaScript object
        await setDoc(userRef, userData);
        return true;
    }

    async createMember({ name, phone, birthday, gymId }) {
        const userRef = doc(collection(db, COLLECTION_NAME));
        await setDoc(userRef, {
            uid: userRef.id,
            name,
            email: generateMemberProfileEmail(userRef.id),
            phone,
            birthday,
            dni: '',
            until: new Date(),
            gymId,
            rol: 1,
            createdAt: new Date(),
        });
        invalidateRequests(`users:all:${gymId}`);
        return userRef.id;
    }



    //get user data from a single user by ID
    async get(uid) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        try {
            const documentSnapshot = await getDoc(userRef);
            if (documentSnapshot.exists()) {
                const user = {
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                };
                return user;
            }
        } catch (error) {
            return error;
        }
    }

    async exists(dni) {
        return this.existsByDni(dni);
    }

    async existsByUid(uid) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const documentSnapshot = await getDoc(userRef);
        return documentSnapshot.exists();
    }

    async existsByDni(dni) {
        const usersRef = collection(db, COLLECTION_NAME);
        const q = query(usersRef, where('dni', '==', dni), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size > 0;
    }

    async existsByEMail(email) {
        const usersRef = collection(db, COLLECTION_NAME);
        const q = query(usersRef, where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        return querySnapshot.size > 0;
    }

    async existsByEmail(email) {
        return this.existsByEMail(email);
    }


    //get all users
    async getAll(gymId = DEFAULT_GYM_ID) {
        return cachedRequest(`users:all:${gymId}`, async () => {
            const usersRef = collection(db, COLLECTION_NAME);
            const querySnapshot = await getDocs(query(usersRef, where('gymId', '==', gymId)));
            return querySnapshot.docs
                .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
                .filter(hasGymAssignment);
        });
    }

    async getAllUsers() {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs
            .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
            ;
    }


    //delete a single user by ID
    async delete(uid) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const result = await deleteDoc(userRef);
        invalidateRequests(`users:all:${DEFAULT_GYM_ID}`);
        return result;
    }


    //Update user data by passing user ID and new Data
    async update(uid, newData) {
        const userRef = doc(db, COLLECTION_NAME, uid);
        const existingUser = await getDoc(userRef);
        const previousGymId = existingUser.data()?.gymId;
        const userData = { ...newData };
        await updateDoc(userRef, userData);
        invalidateRequests(
            `users:all:${previousGymId}`,
            `users:all:${userData.gymId}`,
            `users:all:${DEFAULT_GYM_ID}`,
        );
    }


    async getByEMail(email) {
        const usersRef = collection(db, COLLECTION_NAME);
        const q = query(usersRef, where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const documentSnapshot = querySnapshot.docs[0];
            const user = {
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            };
            return user;
        } else {
            return null;
        }
    }
}


export default UserService.getInstance();
