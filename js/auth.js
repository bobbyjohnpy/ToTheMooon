// js/auth.js
import { auth } from "./firebase.js";
import {
  signInAnonymously,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;
const listeners = [];

export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth);
      return;
    }

    // 🔒 User is now stable and final
    uid = user.uid;

    const authPanel = document.getElementById("authPanel");
    if (user.isAnonymous) {
      authPanel.style.display = "flex";
    } else {
      authPanel.style.display = "none";
    }

    loadTasks();
  });
  console.log("AUTH UID:", user.uid, "anon:", user.isAnonymous);
}

export function onUserReady(cb) {
  if (currentUser) cb(currentUser);
  listeners.push(cb);
}

export async function upgradeAnonymousAccount(email, password) {
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(auth.currentUser, credential);
}

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function getUser() {
  return currentUser;
}
