// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

export const db = getFirestore(app);
export const auth = getAuth(app);
