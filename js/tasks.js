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
import { initAuth, logout } from "./auth.js";

let uid = null;
let unsubscribeTasks = null;
let openTaskId = null;
let activeTaskId = null;
let taskToDeleteId = null;
let F = null;
let pendingDoneColumnId = null;
let dragSourceColumnId = null;
let pendingDoneCard;
let pendingDoneTaskId;
let selectedPriority = "low";

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
    orderBy("createdAt", "desc"),
  );

  unsubscribeTasks = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      const taskId = change.doc.id;
      const task = change.doc.data();

      if (change.type === "removed") {
        taskStore.delete(taskId);
        document.querySelector(`.card[data-id="${taskId}"]`)?.remove();
        return;
      }

      const prev = taskStore.get(taskId);
      let prevpic = prevSnapshot;

      taskStore.set(taskId, task);

      const status = task.status || "todo";
      const container = document.getElementById(
        status === "progress" ? "inprogress" : status,
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
  card.tabIndex = 0;
  card.tabIndex = 0;

  card.addEventListener("focusin", () => {
    card.focus();
  });

  card.innerHTML = `
  <div class = "top-card-container">
    <div class="task-meta hidden">
      <p class="created-at">
        Created ${task.createdAt?.toDate().toLocaleString() || "—"}
      </p>
    </div>
       <button class="card-toggle" aria-label="Toggle task">
    <span class="material-symbols-outlined">expand_more</span></div>


    <div class="task-header">
      <h4>${task.title}</h4>
    </div>

    <div class="progress-meta">
      <span class="${task.subtasks.length ? "show" : "hide"}">subtasks</span>
  <span class="${task.subtasks.length ? "show" : "hide"}">
  subtasks ${countDone(task)}/${task.subtasks?.length || 0}
</span>

    </div>

    <div class="progress">
   <div
  class="progress-bar"
  style="width: ${task.status === "done" ? 100 : calcProgress(task)}%"
></div>

    </div>

    <div class="task-details hidden">
    <div class="task-notes">
  <textarea class="task-notes-input" placeholder="Add a note...">${task.notes || ""}</textarea>
</div>

      <div class="subtasks"></div>
  
      <button class="add-subtask-btn"> <span class = "material-symbols-outlined">add</span>add subtask</button>

    </div>
    
  </div>
    <div class="priority-div">
     <button class="delete-task-btn" aria-label="Delete task">
      <span class="material-symbols-outlined">delete</span>
      Delete Task
    </button>
    <div class="priority ${task.urgency || "medium"}">
      ${(task.urgency || "medium").toUpperCase()}
    </div>
    </div>
  `;
  const priorityEl = card.querySelector(".priority");
  if (task.status === "done") {
    priorityEl.className = "priority done";
    priorityEl.textContent = "DONE";
  }
  priorityEl.addEventListener("click", async (e) => {
    e.stopPropagation();

    // 🔑 Always read latest data
    const currentTask = taskStore.get(taskId);
    if (!currentTask) return;

    const current = currentTask.urgency || "medium";
    const next = getNextPriority(current);

    await updateDoc(doc(db, "users", uid, "tasks", taskId), {
      urgency: next,
    });
  });

  const deleteBtn = card.querySelector(".delete-task-btn");

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // don’t toggle card

    openDeleteTaskModal(taskId);
  });

  // TASK NOTES
  const notesWrapper = card.querySelector(".task-notes");
  const notesInput = notesWrapper.querySelector(".task-notes-input");

  // Stop card click from toggling when typing
  ["click", "focusin", "mousedown"].forEach((evt) =>
    notesInput.addEventListener(evt, (e) => e.stopPropagation()),
  );

  // Save note to Firestore on change
  notesInput.addEventListener("change", async () => {
    await updateDoc(doc(db, "users", uid, "tasks", taskId), {
      notes: notesInput.value,
    });
  });

  const details = card.querySelector(".task-details");
  const meta = card.querySelector(".task-meta");
  const topDiv = card.querySelector(".top-card-container");
  let subtasksRendered = false;

  card.addEventListener("click", () => {
    const open = !details.classList.contains("hidden");

    if (open && openTaskId === taskId) {
      topDiv.style.justifyContent = "flex-end";
      details.classList.add("hidden");
      meta.classList.add("hidden");
      card.classList.remove("open");
      openTaskId = null;
      return;
    }

    openTaskId = taskId;
    topDiv.style.justifyContent = "space-between";
    details.classList.remove("hidden");
    meta.classList.remove("hidden");
    card.classList.add("open");

    if (!subtasksRendered) {
      renderSubtasks(card);
      subtasksRendered = true;
    }
  });

  const toggleBtn = card.querySelector(".card-toggle");

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    card.click();
  });

  setupAddSubtask(card, taskId);
  enableDrag(card);

  return card;
}
const PRIORITY_ORDER = ["low", "medium", "high"];

function getNextPriority(current) {
  const idx = PRIORITY_ORDER.indexOf(current);
  return PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
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
  if (total === 0 && task.status === "done") {
    // task.status = "done";
    console.log("jell");
    bar.classList.add("complete");
    setTimeout(() => bar.classList.remove("complete"), 600);
    bar.style.width = "100%";
    metaCount.textContent = `1/1`;
  }
  const priorityEl = card.querySelector(".priority");

  if (priorityEl && prev?.urgency !== task.urgency) {
    priorityEl.className = `priority ${task.urgency || "medium"}`;
    priorityEl.textContent = (task.urgency || "medium").toUpperCase();
  }
  if (task.status === "done") {
    priorityEl.className = "priority done";
    priorityEl.textContent = "DONE";
  }
  const taskNotesInput = card.querySelector(".task-notes-input");
  if (taskNotesInput) taskNotesInput.value = task.notes || "";
  if (openTaskId === card.dataset.id) {
    task.subtasks?.forEach((s, i) => {
      const row = card.querySelectorAll(".subtask-row")[i];
      if (!row) return;
      const subNotesInput = row.querySelector(".subtask-notes-input");
      if (subNotesInput) subNotesInput.value = s.notes || "";
    });
  }
  if (openTaskId === card.dataset.id) {
    if (
      prevSnapshot &&
      JSON.stringify(prevSnapshot.subtasks) !== JSON.stringify(task.subtasks)
    ) {
    }
    if (
      prev &&
      JSON.stringify(prev.subtasks) !== JSON.stringify(task.subtasks)
    ) {
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
    const date = s.createdAt.toDate();

    const formatted = s.createdAt.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    // Oct 24, 2024, 11:24 AM

    const row = document.createElement("div");
    row.className = "subtask-row";

    row.innerHTML = `
    <div class = "checkbox-date-div">
    <div class = "checkbox-div">
      <input type="checkbox" ${s.completed ? "checked" : ""} />
      <span>${s.text}</span>
      <div class ="subtask-notes"> <textarea class="subtask-notes-input" placeholder="Add a note...">${s.notes || ""}</textarea></div>
      <div class = "date-div">
      </div>
      
      <span>${formatted}</span>
      </div>
      </div>
      <div class ="delete-div">
  <button class= "subtask-delete-btn" aria-label="Delete subtask">
    <span class="material-symbols-outlined">close</span>
  </button>
      </div>
    `;

    const checkboxdateDiv = row.querySelector(".checkbox-date-div");
    const checkboxDiv = checkboxdateDiv.querySelector(".checkbox-div");
    const checkbox = checkboxDiv.querySelector("input");
    const subtaskNotesWrapper = checkboxDiv.querySelector(".subtask-notes");
    console.log(subtaskNotesWrapper);
    const subNotesInput = subtaskNotesWrapper.querySelector(
      ".subtask-notes-input",
    );

    // Stop row click from closing card
    ["click", "focusin", "mousedown"].forEach((evt) =>
      subNotesInput.addEventListener(evt, (e) => e.stopPropagation()),
    );

    // Save note to Firestore
    subNotesInput.addEventListener("change", async () => {
      s.notes = subNotesInput.value; // update local object
      await updateDoc(doc(db, "users", uid, "tasks", taskId), {
        subtasks: task.subtasks,
      });
      console.log("J");
    });
    const deleteBtn = row.querySelector(".subtask-delete-btn");

    deleteBtn.onclick = async (e) => {
      e.stopPropagation();

      // snapshot BEFORE mutation (for UI diffing)
      prevSnapshot = JSON.parse(JSON.stringify(taskStore.get(taskId)));

      // filter out this subtask
      const updatedSubtasks = task.subtasks.filter(
        (st) =>
          !(st.text === s.text && st.createdAt.seconds === s.createdAt.seconds),
      );

      await updateDoc(doc(db, "users", uid, "tasks", taskId), {
        subtasks: updatedSubtasks,
      });
    };

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

    if (details.querySelector(".new-subtask-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "new-subtask-wrapper";

    const input = document.createElement("input");
    input.className = "new-subtask-input";
    input.placeholder = "New subtask…";

    const addBtn = document.createElement("button");
    addBtn.className = "subtask-add-btn";

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = "check";

    const text = document.createElement("span");

    addBtn.append(icon, text);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "subtask-cancel-btn";

    const cancelIcon = document.createElement("span");
    cancelIcon.className = "material-symbols-outlined";
    cancelIcon.textContent = "close";

    const cancelText = document.createElement("span");

    cancelBtn.append(cancelIcon, cancelText);

    // 🔥 STOP CARD FROM INTERCEPTING EVENTS
    ["mousedown", "pointerdown", "click", "focusin"].forEach((evt) => {
      wrapper.addEventListener(evt, (e) => e.stopPropagation());
      input.addEventListener(evt, (e) => e.stopPropagation());
    });

    wrapper.append(input, addBtn, cancelBtn);
    details.insertBefore(wrapper, btn);
    input.focus();

    const submit = async () => {
      const text = input.value.trim();
      if (!text) return;

      await updateDoc(doc(db, "users", uid, "tasks", taskId), {
        subtasks: arrayUnion({
          text,
          completed: false,
          createdAt: Timestamp.now(),
        }),
      });

      wrapper.remove();
    };

    addBtn.onclick = submit;

    cancelBtn.onclick = () => {
      wrapper.remove();
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") wrapper.remove();
    };
  };
}

/* ---------------------
   DRAG & DROP (RESTORED)
--------------------- */
function enableDrag(card) {
  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
    dragSourceColumnId = card.parentElement.id;
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

    const taskId = card.dataset.id;
    const task = taskStore.get(taskId);
    if (!task) return;

    const total = task.subtasks?.length || 0;
    const done = task.subtasks?.filter((s) => s.completed).length || 0;

    // ⚠️ Dropped into Done but incomplete
    if (col.id === "done" && total !== done) {
      // shake for feedback
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 400);

      // store pending intent
      pendingDoneCard = card;
      pendingDoneTaskId = taskId;

      // open modal
      openIncompleteDoneModal(task, done, total);

      // ❗ DO NOT update Firestore yet
      return;
    }

    // ✅ normal allowed drop
    await updateDoc(doc(db, "users", uid, "tasks", taskId), {
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
}

document.getElementById("saveTaskBtn")?.addEventListener("click", async () => {
  const titleInput = document.getElementById("taskTitleInput");

  const title = titleInput?.value.trim();
  if (!title) return alert("Task needs a title");

  const urgency = selectedPriority;

  await addDoc(collection(db, "users", uid, "tasks"), {
    title,
    urgency,
    selectedPriority,
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

function openDeleteTaskModal(taskId) {
  taskToDeleteId = taskId;
  document.getElementById("deleteTaskModal").classList.remove("hidden");
}

function closeDeleteTaskModal() {
  taskToDeleteId = null;
  document.getElementById("deleteTaskModal").classList.add("hidden");
}
document
  .getElementById("confirmDeleteTaskBtn")
  ?.addEventListener("click", async () => {
    if (!taskToDeleteId) return;

    try {
      await deleteDoc(doc(db, "users", uid, "tasks", taskToDeleteId));
      // Firestore snapshot will remove the card
    } catch (err) {
      console.error("Failed to delete task", err);
    } finally {
      closeDeleteTaskModal();
    }
  });

document
  .getElementById("cancelDeleteTaskBtn")
  ?.addEventListener("click", closeDeleteTaskModal);
document.getElementById("deleteTaskModal")?.addEventListener("click", (e) => {
  if (e.target.id === "deleteTaskModal") {
    closeDeleteTaskModal();
  }
});

function openIncompleteDoneModal(task, done, total) {
  const text = document.getElementById("incompleteDoneText");

  text.textContent = `This task still has ${
    total - done
  } unfinished subtask${total - done > 1 ? "s" : ""}.
You can mark it as done anyway, but unfinished work will remain.`;

  document.getElementById("incompleteDoneModal").classList.remove("hidden");
}

function closeIncompleteDoneModal() {
  pendingDoneTaskId = null;
  pendingDoneColumnId = null;
  document.getElementById("incompleteDoneModal").classList.add("hidden");
}
document
  .getElementById("cancelIncompleteDoneBtn")
  ?.addEventListener("click", () => {
    if (pendingDoneCard && dragSourceColumnId) {
      slideCardBack(pendingDoneCard, dragSourceColumnId);
    }

    pendingDoneCard = null;
    pendingDoneTaskId = null;

    closeIncompleteDoneModal();
  });

document
  .getElementById("confirmIncompleteDoneBtn")
  ?.addEventListener("click", async () => {
    if (!pendingDoneTaskId) return;

    try {
      await updateDoc(doc(db, "users", uid, "tasks", pendingDoneTaskId), {
        status: "done",
      });
    } catch (err) {
      console.error("Failed to mark done", err);
    } finally {
      pendingDoneCard = null;
      pendingDoneTaskId = null;
      closeIncompleteDoneModal();
    }
  });

document
  .querySelector("#incompleteDoneModal .delete-modal-backdrop")
  ?.addEventListener("click", closeIncompleteDoneModal);
function slideCardBack(card, sourceColumnId) {
  const sourceCol = document.getElementById(sourceColumnId);
  if (!sourceCol) return;

  // measure current position
  const from = card.getBoundingClientRect();

  // move card back instantly (no animation)
  sourceCol.appendChild(card);

  const to = card.getBoundingClientRect();

  // invert
  const dx = from.left - to.left;
  const dy = from.top - to.top;

  card.style.transition = "none";
  card.style.transform = `translate(${dx}px, ${dy}px)`;

  // animate
  requestAnimationFrame(() => {
    card.style.transition = "transform 220ms ease";
    card.style.transform = "translate(0, 0)";
  });

  // cleanup
  card.addEventListener(
    "transitionend",
    () => {
      card.style.transition = "";
      card.style.transform = "";
    },
    { once: true },
  );
}

document.querySelectorAll(".priority-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".priority-btn")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");
    selectedPriority = btn.dataset.priority;
    console.log("selected priority", selectedPriority);
  });
});
