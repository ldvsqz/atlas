import { GoogleAuthProvider, signInWithPopup, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, deleteUser } from "firebase/auth";
import { httpsCallable } from 'firebase/functions';
import { app, functions } from "./firebase"
import UserService from './userService';
import UserModel from "../src/models/UserModel";
import { Timestamp } from 'firebase/firestore';

const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider();

const createAppError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

const checkRegistrationAvailability = async ({ dni = '', email = '' }) => {
    const checkAvailability = httpsCallable(functions, 'checkRegistrationAvailability');
    const response = await checkAvailability({ dni, email });
    return response.data || {};
};


const signInWithGoogle = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await signInWithPopup(auth, googleProvider);
            const normalizedEmail = (res.user.email || '').trim().toLowerCase();
            const userExists = await UserService.existsByUid(res.user.uid);
            const { emailExists } = await checkRegistrationAvailability({ email: normalizedEmail });
            if (userExists) {
                const user = await UserService.get(res.user.uid);
                resolve(user);
            } else if (emailExists) {
                reject(createAppError('app/email-already-exists', 'Ya existe un perfil registrado con este correo.'));
            } else {
                const user = new UserModel(
                    res.user.birthday || Timestamp.now(),
                    '',
                    normalizedEmail,
                    (res.user.displayName || '').trim(),
                    res.user.phoneNumber || '',
                    res.user.uid,
                    Timestamp.now(),
                );
                await UserService.add(user);
                resolve(user);
            }
        } catch (error) {
            reject(error);
        }
    });
};


const logInWithEmailAndPassword = (email, password) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
};


const registerWithEmailAndPassword = async (dni, birthday, phone, name, email, password) => {
    const normalizedDni = (dni || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPhone = (phone || '').trim();
    const normalizedName = (name || '').trim();

    const { dniExists, emailExists } = await checkRegistrationAvailability({
        dni: normalizedDni,
        email: normalizedEmail,
    });

    if (dniExists) {
        throw createAppError('app/dni-already-exists', 'Ya existe un perfil registrado con este DNI.');
    }

    if (emailExists) {
        throw createAppError('app/email-already-exists', 'Ya existe un perfil registrado con este correo.');
    }

    const res = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const user = new UserModel(
        birthday,
        normalizedDni,
        normalizedEmail,
        normalizedName,
        normalizedPhone,
        res.user.uid,
        Timestamp.now(),
    );

    try {
        await UserService.add(user);
        return user;
    } catch (error) {
        try {
            await deleteUser(res.user);
        } catch (deleteError) {
            console.warn('Error deleting auth user after profile creation failed');
        }
        throw createAppError('app/profile-create-failed', 'No se pudo crear el perfil del usuario.');
    }
};


const sendPasswordReset = (email) => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await sendPasswordResetEmail(auth, email);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
};


const logout = () => {
    signOut(auth);
};


export {
    signInWithGoogle,
    signInWithEmailAndPassword,
    auth,
    logInWithEmailAndPassword,
    registerWithEmailAndPassword,
    sendPasswordReset,
    logout
};
