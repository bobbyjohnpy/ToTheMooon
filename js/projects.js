// js/projects.js
// Project CRUD operations and analytics

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------------
// List all projects
// ---------------------
export function loadProjects(userId, onUpdate) {
  if (!userId) return null;

  const q = query(
    collection(db, "users", userId, "projects"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const projects = [];
    snapshot.forEach((docSnap) => {
      projects.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });

    if (onUpdate) onUpdate(projects);
  });
}

// ---------------------
// Create project
// ---------------------
export async function createProject(userId, name, notes = "") {
  if (!userId || !name) {
    throw new Error("User ID and project name required");
  }

  const docRef = await addDoc(collection(db, "users", userId, "projects"), {
    name,
    status: "active",
    notes: notes ? [{ text: notes, date: Date.now() }] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return docRef.id;
}

// ---------------------
// Get single project
// ---------------------
export async function getProject(userId, projectId) {
  if (!userId || !projectId) return null;

  const snap = await getDoc(doc(db, "users", userId, "projects", projectId));

  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------------------
// Update project
// ---------------------
export async function updateProject(userId, projectId, updates) {
  if (!userId || !projectId) return;

  await updateDoc(doc(db, "users", userId, "projects", projectId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

// ---------------------
// Delete project
// ---------------------
export async function deleteProject(userId, projectId) {
  if (!userId || !projectId) return;

  await deleteDoc(doc(db, "users", userId, "projects", projectId));
}

// ---------------------
// Add project note
// ---------------------
export async function addProjectNote(userId, projectId, text) {
  if (!userId || !projectId || !text) return;

  const ref = doc(db, "users", userId, "projects", projectId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const project = snap.data();
  const notes = project.notes || [];
  notes.push({ text, date: Date.now() });

  await updateDoc(ref, { notes, updatedAt: Date.now() });
}
