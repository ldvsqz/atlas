import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getFunctions } from "firebase/functions"

const firebaseConfig = {
  apiKey: "AIzaSyClgcMOlZg5OeL2Cjwg1s0zYaDMS8m1OZg",
  authDomain: "atlas-gym-partner.firebaseapp.com",
  databaseURL: "https://atlas-gym-partner-default-rtdb.firebaseio.com",
  projectId: "atlas-gym-partner",
  storageBucket: "atlas-gym-partner.firebasestorage.app",
  messagingSenderId: "91174508336",
  appId: "1:91174508336:web:f8630c647aec27abf79af5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const functions = getFunctions(app, 'us-central1')

export {db}
export {app}
export {functions}
