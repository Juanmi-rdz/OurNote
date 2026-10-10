import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDrIJ-l0kT1tLhYovEmdBNpjgk2nIbDcnI",
  authDomain: "ournote-a8f50.firebaseapp.com",
  projectId: "ournote-a8f50",
  storageBucket: "ournote-a8f50.firebasestorage.app",
  messagingSenderId: "519271646650",
  appId: "1:519271646650:web:f5bc40d6ed20dbefc5c983",
  measurementId: "G-HYTPCCD767"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);