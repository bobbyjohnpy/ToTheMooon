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
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let uid = null;
let unsubscribeTasks = null;
let openTaskId = null;
let activeTaskId = null;

/* ---------------------
   LOCAL TASK STORE
--------------------- */
const taskStore = new Map(); // taskId -> task object

/* ---------------------
   LOAD TASKS
--------------------- */
export function loadTasks(userId) {
  if (!userId) return;
  uid = userId;

  if (unsubscribeTasks) unsubscribeTasks();

  const q = query(
    collection(db, "users", uid, "tasks"),
    orderBy("createdAt", "desc")
  );

  unsubscribeTasks = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const taskId = change.doc.id;
      const task = change.doc.data();
      console.log("Task change:", change.type, taskId, task);

      if (change.type === "removed") {
        taskStore.delete(taskId);
        document.querySelector(`.card[data-id="${taskId}"]`)?.remove();
        return;
      }

      const prev = taskStore.get(taskId);
      let prevpic = prevSnapshot;
      console.log("Previous task data:", prev);
      taskStore.set(taskId, task);
      console.log(taskStore);

      const status = task.status || "todo";
      const container = document.getElementById(
        status === "progress" ? "inprogress" : status
      );

      const existing = document.querySelector(`.card[data-id="${taskId}"]`);

      if (!existing) {
        container.appendChild(renderTask(taskId, task));
      } else {
        updateCardUI(existing, task, prev, prevpic);
      }
    });

    updateCounters();
  });
}

/* ---------------------
   ADD SUBTASK (PUBLIC – DO NOT TOUCH)


/* ---------------------
   RENDER TASK CARD
--------------------- */
function renderTask(taskId, task) {
  const card = document.createElement("div");
  card.className = `card priority-${task.urgency || "medium"}`;
  card.dataset.id = taskId;
  card.draggable = true;

  card.innerHTML = `
    <div class="task-meta hidden">
      <p class="created-at">
        Created ${task.createdAt?.toDate().toLocaleString() || "—"}
      </p>
    </div>

    <div class="task-header">
      <h4>${task.title}</h4>
    </div>

    <div class="progress-meta">
      <span>subtasks</span>
      <span>${countDone(task)}/${task.subtasks?.length || 0}</span>
    </div>

    <div class="progress">
      <div class="progress-bar" style="width:${calcProgress(task)}%"></div>
    </div>

    <div class="task-details hidden">
      <div class="subtasks"></div>
  
      <button class="add-subtask-btn"> <span class = "material-symbols-outlined">add</span>add subtask</button>

    </div>
    <div class="priority-div">
    <div class="priority ${task.urgency || "medium"}">
      ${(task.urgency || "medium").toUpperCase()}
    </div>
    </div>
  `;

  const details = card.querySelector(".task-details");
  const meta = card.querySelector(".task-meta");

  card.addEventListener("click", () => {
    const open = !details.classList.contains("hidden");

    if (open && openTaskId === taskId) {
      details.classList.add("hidden");
      meta.classList.add("hidden");
      openTaskId = null;
      return;
    }

    openTaskId = taskId;
    details.classList.remove("hidden");
    meta.classList.remove("hidden");
    renderSubtasks(card);
  });

  setupAddSubtask(card, taskId);
  enableDrag(card);

  return card;
}

/* ---------------------
   UPDATE CARD UI
--------------------- */
function updateCardUI(card, task, prev, prevSnapshot) {
  const bar = card.querySelector(".progress-bar");
  const metaCount = card.querySelector(".progress-meta span:last-child");

  const done = countDone(task);
  const total = task.subtasks?.length || 0;

  if (total && done === total) {
    bar.classList.add("complete");
    setTimeout(() => bar.classList.remove("complete"), 600);
  }
  bar.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  metaCount.textContent = `${done}/${total}`;
  console.log("Updating card UI for task:", task);
  if (openTaskId === card.dataset.id) {
    console.log("Card is open, checking subtasks for changes.");
    console.log(prev);
    console.log(prevSnapshot);
    if (
      prevSnapshot &&
      JSON.stringify(prevSnapshot.subtasks) !== JSON.stringify(task.subtasks)
    ) {
      console.log("Firestore confirmed update", task.subtasks);
    }
    if (
      prev &&
      JSON.stringify(prev.subtasks) !== JSON.stringify(task.subtasks)
    ) {
      console.log("Firestore confirmed update:", task.subtasks);
    }
    renderSubtasks(card);
  }
}
let prevSnapshot = null;
/* ---------------------
   RENDER SUBTASKS (DO NOT CHANGE)
--------------------- */
function renderSubtasks(card) {
  const taskId = card.dataset.id;
  const task = taskStore.get(taskId);
  if (!task) return;

  const container = card.querySelector(".subtasks");
  container.innerHTML = "";

  task.subtasks?.forEach((s) => {
    const row = document.createElement("div");
    row.className = "subtask-row";

    row.innerHTML = `
      <input type="checkbox" ${s.completed ? "checked" : ""} />
      <span>${s.text}</span>
    `;

    const checkbox = row.querySelector("input");
    checkbox.onclick = (e) => e.stopPropagation();
    prevSnapshot = JSON.parse(JSON.stringify(taskStore.get(taskId)));
    checkbox.onchange = async () => {
      s.completed = checkbox.checked;
      await updateDoc(doc(db, "users", uid, "tasks", taskId), {
        subtasks: task.subtasks,
      });
    };

    container.appendChild(row);
  });
}

/* ---------------------
   ADD SUBTASK INPUT
--------------------- */
function setupAddSubtask(card, taskId) {
  const btn = card.querySelector(".add-subtask-btn");
  const details = card.querySelector(".task-details");

  btn.onclick = (e) => {
    e.stopPropagation();

    const input = document.createElement("input");
    input.className = "new-subtask-input";
    input.placeholder = "New subtask…";

    details.insertBefore(input, btn);
    input.focus();

    input.onkeydown = async (e) => {
      if (e.key !== "Enter") return;

      const text = input.value.trim();
      if (!text) return;

      await updateDoc(doc(db, "users", uid, "tasks", taskId), {
        subtasks: arrayUnion({
          text,
          completed: false,
          createdAt: Timestamp.now(),
        }),
      });

      input.remove();
    };
  };
}

/* ---------------------
   DRAG & DROP (RESTORED)
--------------------- */
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
    if (card) col.appendChild(card);
  });

  col.addEventListener("drop", async () => {
    const card = document.querySelector(".dragging");
    if (!card) return;

    await updateDoc(doc(db, "users", uid, "tasks", card.dataset.id), {
      status: col.id,
    });
  });
});

/* ---------------------
   ADD TASK MODAL (RESTORED)
--------------------- */
document.getElementById("newTaskBtn")?.addEventListener("click", () => {
  openTaskModal();
});

function openTaskModal() {
  activeTaskId = null;
  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("taskTitleInput").value = "";
  document.getElementById("taskPriorityInput").value = "medium";
}

document.getElementById("saveTaskBtn")?.addEventListener("click", async () => {
  const title = document.getElementById("taskTitleInput").value.trim();
  if (!title) return alert("Task needs a title");

  const urgency = document.getElementById("taskPriorityInput").value;

  await addDoc(collection(db, "users", uid, "tasks"), {
    title,
    urgency,
    status: "todo",
    subtasks: [],
    createdAt: Timestamp.now(),
  });

  closeModal();
});

document.getElementById("cancelTaskBtn")?.addEventListener("click", closeModal);

function closeModal() {
  document.getElementById("taskModal").classList.add("hidden");
  activeTaskId = null;
}

/* ---------------------
   COUNTERS
--------------------- */
function updateCounters() {
  ["todo", "started", "inprogress", "done"].forEach((id) => {
    document.getElementById(`count-${id}`).textContent =
      document.querySelectorAll(`#${id} .card`).length;
  });
}

/* ---------------------
   HELPERS
--------------------- */
function countDone(task) {
  return task.subtasks?.filter((s) => s.completed).length || 0;
}

function calcProgress(task) {
  if (!task.subtasks?.length) return 0;
  return Math.round((countDone(task) / task.subtasks.length) * 100);
}
function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
}
document
  .getElementById("darkModeToggle")
  .addEventListener("click", toggleDarkMode);
