import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function ensureFirstProject(uid) {
  const projectsRef = collection(db, "users", uid, "projects");
  const snap = await getDocs(projectsRef);

  // ✅ If projects already exist, return first one
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  // 🆕 Create first project
  const docRef = await addDoc(projectsRef, {
    name: "My First Project",
    createdAt: serverTimestamp(),
  });

  console.log("Created first project:", docRef.id);
  return docRef.id;
}
export async function createProject(uid, name) {
  if (!uid) throw new Error("Missing uid");
  if (!name) throw new Error("Project name required");

  const ref = await addDoc(collection(db, "users", uid, "projects"), {
    name,
    createdAt: Timestamp.now(),
  });

  return ref.id;
}

export async function getProjects(uid) {
  const q = query(
    collection(db, "users", uid, "projects"),
    orderBy("createdAt", "asc"),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
