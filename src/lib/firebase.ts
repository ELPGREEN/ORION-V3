/**
 * Firebase Configuration — Orion Project
 * Used for: Hosting TTS/WASM models, Analytics
 * All keys here are publishable (safe for client-side code).
 */
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDq901BsZWTKzNgUk2qkDg1BL9lXz1-VKQ",
  authDomain: "orion-d3734.firebaseapp.com",
  projectId: "orion-d3734",
  storageBucket: "orion-d3734.firebasestorage.app",
  messagingSenderId: "550674472945",
  appId: "1:550674472945:web:a9198f03e49439ef816e50",
  measurementId: "G-YRP13P0XQ3",
};

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics — only init in browser environments that support it
export const initFirebaseAnalytics = async () => {
  const supported = await isSupported();
  if (supported) {
    return getAnalytics(firebaseApp);
  }
  return null;
};

// Storage — for hosting Piper TTS WASM models
export const firebaseStorage = getStorage(firebaseApp);
