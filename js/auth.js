// js/auth.js
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔒 single source of truth
let currentUser = null;
let currentUID = null;
let readyCallbacks = [];

export function initAuth(onReady) {
  if (onReady) readyCallbacks.push(onReady);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth);
      return;
    }

    currentUser = user;
    currentUID = user.uid;

    const authPanel = document.getElementById("authPanel");
    const signInButton = document.getElementById("signInButton");
    const logoutBtn = document.getElementById("logoutBtn");
    console.log("in auth.js");
    if (signInButton) {
      signInButton.classList.toggle("hidden", !user.isAnonymous);
      console.log("in sign in");
    }

    if (logoutBtn) {
      logoutBtn.classList.toggle("hidden", user.isAnonymous);
      console.log("in hide log out");
    }

    if (authPanel) {
      authPanel.classList.add("hidden"); // always close on auth change
    }

    readyCallbacks.forEach((cb) => cb(user));
  });
}

export function getUID() {
  return currentUID;
}

export function getUser() {
  return currentUser;
}

// ───────── AUTH ACTIONS ─────────

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function upgradeAnonymousAccount(email, password) {
  if (!currentUser || !currentUser.isAnonymous) {
    throw new Error("No anonymous user to upgrade");
  }

  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(currentUser, credential);
}
export async function logout() {
  await signOut(auth);
  location.reload(); // clean reset
}
