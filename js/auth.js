// js/auth.js
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ───────── STATE ─────────
let currentUser = null;
const authSubscribers = new Set();

let authInitialized = false;

// ───────── INITIALIZE AUTH ─────────
export function initAuth(onReady) {
  if (onReady) authSubscribers.add(onReady);

  if (authInitialized) return;
  authInitialized = true;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // No user → create anonymous account
      try {
        await signInAnonymously(auth);
        return; // callback will fire on next state change
      } catch (err) {
        console.error("Failed to sign in anonymously", err);
        return;
      }
    }

    // user exists
    currentUser = user;

    // Update UI for auth state
    updateAuthUI(user);

    // Fire all ready callbacks
    authSubscribers.forEach((cb) => cb(user));
  });
}

// ───────── GETTERS ─────────
export function getUser() {
  return currentUser;
}
export function getUID() {
  return currentUser?.uid || null;
}

// ───────── AUTH ACTIONS ─────────
export async function signIn(email, password) {
  if (!email || !password) throw new Error("Missing email or password");
  const user = await signInWithEmailAndPassword(auth, email, password);
  currentUser = user.user;
  updateAuthUI(currentUser);
  return currentUser;
}

export async function upgradeAnonymousAccount(email, password) {
  if (!currentUser) throw new Error("No current user");
  if (!currentUser.isAnonymous) throw new Error("User is already registered");

  const credential = EmailAuthProvider.credential(email, password);
  try {
    const result = await linkWithCredential(currentUser, credential);
    currentUser = result.user;
    updateAuthUI(currentUser);
    return currentUser;
  } catch (err) {
    console.error("Failed to upgrade anonymous account", err);
    throw err;
  }
}

// js/auth.js
export async function logout() {
  try {
    window.dispatchEvent(new Event("user-logout"));
    await signOut(auth);
  } catch (err) {
    console.error("Logout failed", err);
  }
}

// ───────── CALLBACK REGISTRATION ─────────
export function onAuthReady(cb) {
  authSubscribers.add(cb);
  if (currentUser) cb(currentUser);

  // 🔑 optional unsubscribe handle
  return () => authSubscribers.delete(cb);
}

// ───────── UI UPDATE (SIGN-IN / LOGOUT BUTTONS) ─────────
function updateAuthUI(user) {
  const signInBtn = document.getElementById("signInButton");
  const logoutBtn = document.getElementById("logoutBtn");
  const authPanel = document.getElementById("authPanel");

  if (signInBtn) signInBtn.classList.toggle("hidden", !user.isAnonymous);
  if (logoutBtn) logoutBtn.classList.toggle("hidden", user.isAnonymous);
  if (authPanel) authPanel.classList.add("hidden");
}
