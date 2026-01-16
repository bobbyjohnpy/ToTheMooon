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
    // Clear columns
    ["todo", "started", "inprogress", "done"].forEach((id) => {
      document.getElementById(id).innerHTML = "";
    });

    snapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const status = task.status || "todo";

      const container = document.getElementById(
        status === "progress" ? "inprogress" : status
      );

      if (!container) return;

      container.appendChild(renderTask(uid, docSnap.id, task));
    });

    updateCounters();
  });
}
let activeTaskId = null;

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
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = id;

  // Progress calculation
  const total = task.subtasks?.length || 0;
  const done = task.subtasks?.filter((s) => s.completed).length || 0;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const progressBar =
    task.status === "done"
      ? `<div class="progress-done"><span style="width:100%"></span></div>`
      : `<div class="progress"><span style="width:${percent}%"></span></div>`;

  card.innerHTML = `
    <h4>${task.title}</h4>

    <div class="progress-meta">
      <span>Subtasks</span>
      <span>${done} / ${total}</span>
    </div>

    ${progressBar}

    <div class="priority ${task.urgency}">
      ${task.urgency.toUpperCase()}
    </div>
  `;
  card.addEventListener("click", () => {
    openTaskModal(task, id);
  });

  return card;
}

let draggedTaskId = null;

// Drag start / end
document.addEventListener("dragstart", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;

  draggedTaskId = card.dataset.id;
  card.classList.add("dragging");
});

document.addEventListener("dragend", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;

  card.classList.remove("dragging");
  draggedTaskId = null;
});
document.querySelectorAll(".column-body").forEach((body) => {
  body.addEventListener("dragover", (e) => {
    e.preventDefault();
    body.parentElement.classList.add("dragover");
  });

  body.addEventListener("dragleave", () => {
    body.parentElement.classList.remove("dragover");
  });

  body.addEventListener("drop", async (e) => {
    e.preventDefault();
    body.parentElement.classList.remove("dragover");

    if (!draggedTaskId) return;

    let newStatus = body.id;
    if (newStatus === "inprogress") newStatus = "progress";

    await updateDoc(doc(db, "users", uid, "tasks", draggedTaskId), {
      status: newStatus,
    });
  });
});
function updateCounters() {
  document.getElementById("count-todo").textContent =
    document.querySelectorAll("#todo .card").length;

  document.getElementById("count-started").textContent =
    document.querySelectorAll("#started .card").length;

  document.getElementById("count-inprogress").textContent =
    document.querySelectorAll("#inprogress .card").length;

  document.getElementById("count-done").textContent =
    document.querySelectorAll("#done .card").length;
}
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function createTask(uid) {
  const title = prompt("Task title?");
  if (!title) return;

  await addDoc(collection(db, "users", uid, "tasks"), {
    title,
    urgency: "medium",
    status: "todo",
    subtasks: [],
    createdAt: Date.now(),
  });
}
document.getElementById("newTaskBtn").addEventListener("click", () => {
  openTaskModal();
});
function openTaskModal(task = null, id = null) {
  activeTaskId = id;

  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("modalTitle").textContent = task
    ? "Edit Task"
    : "New Task";

  document.getElementById("taskTitleInput").value = task?.title || "";
  document.getElementById("taskPriorityInput").value =
    task?.urgency || "medium";

  const list = document.getElementById("subtaskList");
  list.innerHTML = "";

  (task?.subtasks || []).forEach((s) => {
    const row = document.createElement("div");
    row.textContent = `• ${s.text}`;
    list.appendChild(row);
  });

  document.getElementById("taskMeta").textContent = task
    ? `Created ${new Date(task.createdAt).toLocaleString()}`
    : "";
}
document.getElementById("saveTaskBtn").addEventListener("click", async () => {
  const title = document.getElementById("taskTitleInput").value.trim();
  const urgency = document.getElementById("taskPriorityInput").value;

  if (!title) return alert("Task needs a title");

  if (activeTaskId) {
    await updateDoc(doc(db, "users", uid, "tasks", activeTaskId), {
      title,
      urgency,
    });
  } else {
    await addDoc(collection(db, "users", uid, "tasks"), {
      title,
      urgency,
      status: "todo",
      subtasks: [],
      createdAt: Date.now(),
    });
  }

  closeModal();
});
document
  .getElementById("newSubtaskInput")
  .addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !activeTaskId) return;

    const text = e.target.value.trim();
    if (!text) return;

    await updateDoc(doc(db, "users", uid, "tasks", activeTaskId), {
      subtasks: arrayUnion({
        text,
        completed: false,
        createdAt: Date.now(),
      }),
    });

    e.target.value = "";
  });
document.getElementById("cancelTaskBtn").addEventListener("click", closeModal);

function closeModal() {
  document.getElementById("taskModal").classList.add("hidden");
  activeTaskId = null;
}
