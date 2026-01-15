import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔒 single source of truth
let currentUser = null;
let currentUID = null;

export function initAuth(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      await signInAnonymously(auth);
      return;
    }

    // ✅ user exists ONLY here
    currentUser = user;
    currentUID = user.uid;

    const authPanel = document.getElementById("authPanel");
    if (authPanel) {
      authPanel.style.display = user.isAnonymous ? "flex" : "none";
    }

    // ✅ notify page when auth is ready
    if (onReady) onReady(user);
  });
}

export function getUID() {
  return currentUID;
}

export function getUser() {
  return currentUser;
}
