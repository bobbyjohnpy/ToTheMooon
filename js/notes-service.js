// js/notes-service.js
import { db } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getUID } from "./auth.js";
import { getKanbanMode, onKanbanModeChange } from "./kanban-mode.js";
import { getCurrentProject, onProjectChange } from "./project.js";
import { clearTasksUI } from "./tasks.js"; // optional: clear grid before render

// ───────── STATE ─────────
let unsubscribeNotes = null;
const subscribers = new Set(); // callbacks to notify UI

// ───────── INTERNAL ─────────
function getNotesCollectionRef(uid) {
  const mode = getKanbanMode();
  if (!uid) return null;

  if (mode === "root") {
    return collection(db, "users", uid, "rootNotes");
  } else {
    const projectId = getCurrentProject();
    if (!projectId) return null;
    return collection(db, "users", uid, "projects", projectId, "notes");
  }
}

// ───────── SUBSCRIBE ─────────
export function subscribeNotes() {
  const uid = getUID();
  if (!uid) return;

  // cleanup previous listener
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  const ref = getNotesCollectionRef(uid);
  if (!ref) return;

  const q = query(ref, orderBy("updatedAt", "desc"));

  unsubscribeNotes = onSnapshot(q, (snap) => {
    const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // notify all subscribers
    subscribers.forEach((cb) => cb(notes));
  });
}

// ───────── SUBSCRIBE CALLBACK ─────────
export function onNotesChange(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

// ───────── CRUD ─────────
export async function createNote(data = {}) {
  const uid = getUID();
  const ref = getNotesCollectionRef(uid);

  const payload = {
    title: data.title || "Untitled Note",
    content: data.content || "",
    category: data.category || {
      name: "General",
      color: "#6b7280",
    },
    tags: data.tags || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(ref, payload);
  return { id: docRef.id, ...payload };
}
export async function updateNote(id, data) {
  const uid = getUID();
  if (!uid) throw new Error("No user signed in");

  const ref = getNotesCollectionRef(uid);
  if (!ref) throw new Error("No notes collection available");

  const docRef = doc(ref, id);

  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, payload);
}

export async function deleteNote(id) {
  const uid = getUID();
  if (!uid) throw new Error("No user signed in");

  const ref = getNotesCollectionRef(uid);
  if (!ref) throw new Error("No notes collection available");

  await deleteDoc(doc(ref, id));
}

// ───────── LISTENER HOOKS ─────────
// automatically re-subscribe on project or kanban mode change
onKanbanModeChange(() => subscribeNotes());
onProjectChange(() => subscribeNotes());
