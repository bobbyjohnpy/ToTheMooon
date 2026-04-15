// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoFnzTnVlvebTeHly2tzkaV9tz-OxNvnw",
  authDomain: "tothemoon100percent.firebaseapp.com",
  projectId: "tothemoon100percent",
  storageBucket: "tothemoon100percent.firebasestorage.app",
  messagingSenderId: "1084909945870",
  appId: "1:1084909945870:web:4c29fb6da7d251daf4e85f",
};

const app = initializeApp(firebaseConfig);

// ✅ Initialize Firestore with persistent cache and multi-tab support
export const db = initializeFirestore(app, {
  cache: {
    type: "persistent", // use IndexedDB for persistence
    sizeBytes: CACHE_SIZE_UNLIMITED, // optional, unlimited cache
  },
  synchronizeTabs: true, // enables multi-tab sync
});

export const auth = getAuth(app);
