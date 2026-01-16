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
  Timestamp,
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
// Add Note
// ---------------------

// ---------------------
// Complete Task
// ---------------------

// ---------------------
// Delete Task
// ---------------------

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
export function renderTask(uid, taskId, task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.id = taskId;

  card.innerHTML = `
    <div class="task-main">
      <div class="task-title">${task.title}</div>
      <div class="task-meta">
        <span class="priority ${task.priority}">${task.priority}</span>
        <span class="created">${new Date(
          task.createdAt?.seconds * 1000
        ).toLocaleDateString()}</span>
      </div>

      <div class="progress">
        <div class="progress-bar" style="width:${calcProgress(task)}%"></div>
      </div>
    </div>

    <div class="task-details hidden">
      <div class="subtasks"></div>
      <button class="add-subtask">+ Add Subtask</button>
    </div>
  `;

  // Expand on click
  card.querySelector(".task-main").addEventListener("click", () => {
    card.querySelector(".task-details").classList.toggle("hidden");
    renderSubtasks(card, task);
  });

  enableDrag(card);
  return card;
}
function calcProgress(task) {
  if (!task.subtasks?.length) return 0;
  const done = task.subtasks.filter((s) => s.completed).length;
  return Math.round((done / task.subtasks.length) * 100);
}

function renderSubtasks(card, task) {
  const container = card.querySelector(".subtasks");
  container.innerHTML = "";

  task.subtasks?.forEach((s, index) => {
    const row = document.createElement("div");
    row.className = "subtask-row";
    row.innerHTML = `
      <input type="checkbox" ${s.completed ? "checked" : ""} />
      <span>${s.text}</span>
    `;

    row.querySelector("input").onchange = async () => {
      const ref = doc(db, "users", uid, "tasks", card.dataset.id);
      const snap = await getDoc(ref);
      const data = snap.data();
      data.subtasks[index].completed = !data.subtasks[index].completed;

      await updateDoc(ref, { subtasks: data.subtasks });
    };

    container.appendChild(row);
  });

  card.querySelector(".add-subtask").onclick = async () => {
    const text = prompt("Subtask name");
    if (!text) return;

    await updateDoc(doc(db, "users", uid, "tasks", card.dataset.id), {
      subtasks: arrayUnion({
        text,
        completed: false,
        createdAt: Timestamp.now(),
      }),
    });
  };
}

function enableDrag(card) {
  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
}

document.querySelectorAll(".column-body").forEach((col) => {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
    const card = document.querySelector(".dragging");
    if (!card) return;
    col.appendChild(card);
  });

  col.addEventListener("drop", async () => {
    const card = document.querySelector(".dragging");
    if (!card) return;

    const newStatus = col.id;
    await updateDoc(doc(db, "users", uid, "tasks", card.dataset.id), {
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
  document.getElementById("saveTaskBtn").onclick = async () => {
    const title = document.getElementById("taskTitleInput").value.trim();
    const priority = document.getElementById("taskPriorityInput").value;

    if (!title) return alert("Task needs a title");

    await addDoc(collection(db, "users", uid, "tasks"), {
      title,
      priority,
      status: "todo",
      subtasks: [],
      createdAt: Timestamp.now(),
    });

    closeModal();
  };

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
