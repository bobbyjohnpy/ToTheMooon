// js/tasks.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let uid = null;

// ---------------------
// Load Tasks
// ---------------------
export function loadTasks(userId) {
  if (!userId) return null;
  uid = userId;

  const q = query(
    collection(db, "users", uid, "tasks"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const columns = {
      todo: document.getElementById("todo"),
      started: document.getElementById("started"),
      inprogress: document.getElementById("inprogress"),
      done: document.getElementById("done"),
    };

    // Clear columns
    Object.values(columns).forEach((col) => {
      if (col) col.innerHTML = "";
    });


snapshot.forEach((docSnap) => {
  const task = docSnap.data();
  const el = renderTask(uid, docSnap.id, task);
  columns[task.status || "todo"]?.appendChild(el);
});
  });
}

// ---------------------
// Add Task
// ---------------------
export async function addTask(title, urgency, noteText) {
  if (!title) return alert("Task needs a name");
  if (!uid) return alert("User not authenticated");

  await addDoc(collection(db, "users", uid, "tasks"), {
    title,
    urgency,
    notes: noteText ? [{ text: noteText, date: Date.now() }] : [],
    createdAt: Date.now(),
    completed: false,
    completedAt: null,
  });
}

// ---------------------
// Add Note
// ---------------------
export async function addNote(taskId, text) {
  if (!text || !uid) return;

  await updateDoc(doc(db, "users", uid, "tasks", taskId), {
    notes: arrayUnion({ text, date: Date.now() }),
  });
}

// ---------------------
// Complete Task
// ---------------------
export async function completeTask(taskId) {
  if (!uid) return;
  await updateDoc(doc(db, "users", uid, "tasks", taskId), {
    completed: true,
    completedAt: Date.now(),
  });
}

// ---------------------
// Delete Task
// ---------------------
export async function deleteTask(taskId) {
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "tasks", taskId));
}

export async function addSubtask(e, taskId) {
  if (e.key !== "Enter") return;

  const text = e.target.value.trim();
  if (!text) return;

  e.target.value = "";

  await updateDoc(doc(db, "users", uid, "tasks", taskId), {
    subtasks: arrayUnion({ text, completed: false }),
  });
}

export async function toggleSubtask(uid, taskId, index, current) {
  const ref = doc(db, "users", uid, "tasks", taskId);

  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const task = snap.data();
  task.subtasks[index].completed = !current;

  await updateDoc(ref, {
    subtasks: task.subtasks,
  });
}

// ---------------------
// Render Task
// ---------------------
export function renderTask(uid, id, task) {
  const div = document.createElement("div");
  div.className = "card"; // 🔑 match Kanban styles

  div.innerHTML = `
    <h4>${task.title}</h4>

    <div class="task-meta">
      Created ${new Date(task.createdAt).toLocaleDateString()}
    </div>

    <div class="task-notes">
      ${(task.notes || [])
        .map(
          (n) => `<div class="note">
            ${n.text}
            <small>${new Date(n.date).toLocaleString()}</small>
          </div>`
        )
        .join("")}
    </div>

    <textarea
      placeholder="Add note and press Enter"
      class="task-note-input"
    ></textarea>

    <div class="task-actions">
      ${
        task.completed
          ? `<span style="color: var(--urgency-low)">Completed</span>`
          : `<span class="complete-task">Complete</span>`
      }
      <span class="delete-task">Delete</span>
    </div>

    <div class="subtasks">
      <ul>
        ${
          task.subtasks
            ?.map(
              (s, i) => `
            <li class="${s.completed ? "done" : ""}">
              <input
                type="checkbox"
                class="subtask-toggle"
                data-task-id="${id}"
                data-index="${i}"
                ${s.completed ? "checked" : ""}
              />
              <span>${s.text}</span>
            </li>
          `
            )
            .join("") || ""
        }
      </ul>

      <input
        class="subtask-input"
        placeholder="Add subtask and press Enter"
      />
    </div>

    <!-- 🔹 PRIORITY BADGE (copied from Kanban design) -->
    <div class="priority ${task.urgency}">
      ${task.urgency.toUpperCase()}
    </div>
  `;

  // listeners stay EXACTLY the same
  ...
  return div;
}
