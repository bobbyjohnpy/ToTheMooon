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
  getDocs,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getKanbanMode } from "./kanban-mode.js";
import { getUID } from "./auth.js";
import { compareValues } from "./sort.js";
import { getSortPreference, setSortPreference } from "./sort-preferences.js";

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
let sortOptionsBuilt = false;
let loadtaskCalled = false;
let checkboxClicked = false;
let activeSubtaskId = null;
let TaskOrSubtask = "";
let testCount = 0;
("");
/* ---------------------
   LOCAL TASK STORE
--------------------- */
const taskStore = new Map(); // taskId -> task object

const page = document.body.dataset.page;
let currentSort = getSortPreference(page);
const CATEGORY_STORAGE_KEY = "taskCategories";
const categoryMap = new Map(); // name -> { name, color }
/* ---------------------
   LOAD TASKS
--------------------- */
import { getCurrentProject, onProjectChange } from "./project.js";

export function loadTasksForProject(userId, projectId) {
  console.log("hhelo");
  categoryMap.clear();

  if (unsubscribeTasks) unsubscribeTasks();
  uid = userId;
  if (!uid) throw new Error("UID not initialized");
  if (!projectId) throw new Error("No project selected");
  const spinner = document.getElementById("taskLoading");

  spinner.style.display = "flex";
  const tasksCol = collection(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "tasks",
  );
  const q = query(tasksCol, orderBy("createdAt", "desc"));

  unsubscribeTasks = onSnapshot(q, (snapshot) => {
    console.count("on snpshot fired");
    console.log("in on snapshot");
    snapshot.docChanges().forEach((change) => {
      const taskId = change.doc.id;
      const task = change.doc.data();

      if (task.category?.name) {
        categoryMap.set(task.category.name, task.category);
      }

      if (change.type === "removed") {
        taskStore.delete(taskId);
        document.querySelector(`.card[data-id="${taskId}"]`)?.remove();
        return;
      }

      const prev = taskStore.get(taskId);
      taskStore.set(taskId, task);

      const container = document.getElementById(task.status || "todo");
      const existing = document.querySelector(`.card[data-id="${taskId}"]`);
      console.log(task, "task within snapshot");
      if (!existing) {
        container.prepend(renderTask(taskId, task));
        console.log("new card");
      } else {
        console.log("update task ui");
        updateCardUI(existing, task, prev);
      }
    });
    if (!sortOptionsBuilt && taskStore.size > 0) {
      buildSortDropdown();
      sortOptionsBuilt = true;
    }
    console.log("hel;lo");
    updateCounters();
    if (!loadtaskCalled) {
      console.log("aaply cuurent sort");
      applyCurrentSort();
    }
    loadtaskCalled = true;
    console.log("spinier hide");
  });

  spinner.style.display = "none";
}

// Listen to project switches
export function initProjectTasks(userId) {
  if (!document.getElementById("todo")) return;
  onProjectChange((projectId) => {
    clearTasksUI();
    if (projectId) loadTasksForProject(userId, projectId);
  });
}

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
  const hasSubtasks = task.subtasks?.length > 0;
  const isDone = task.status === "done";
  const category = task.category || { name: "General", color: "#444" };
  const labelText = hasSubtasks ? "subtasks" : isDone ? "Task complete" : "";

  const countText = hasSubtasks
    ? `${countDone(task)}/${task.subtasks.length}`
    : isDone
      ? "1/1"
      : "";

  // Then in your HTML:

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
    <div class = "pill-container">
<div class="category-pill" style="color:${category.color}">
  ${category.name.toUpperCase()}
</div>
  <div class="priority ${task.urgency || "medium"}">
      ${(task.urgency || "medium").toUpperCase()}
    </div>
    </div>
    <div class="progress-meta">

    <span class="${labelText ? "show" : "hide"}">${labelText}</span>
 
</span>
 <span class="${countText ? "show" : "hide"}">${countText}</span>


    </div>

    <div class="progress">
   <div
  class="progress-bar"
  style="width: ${task.status === "done" ? 100 : calcProgress(task)}%"
></div>

    </div>

    <div class="task-details hidden">
  
      <div class="subtasks"></div>
  
      <button class="add-subtask-btn"> <span class = "material-symbols-outlined">add</span>add subtask</button>

    </div>
    
  </div>
    <div class="priority-div">
    
   <button class="task-notes-btn">
<span class="material-symbols-outlined">add_notes</span>
<span  class = "main-task-note-text">notes</span>
</button>
     <button class="delete-task-btn" aria-label="Delete task">
      <span class="material-symbols-outlined">delete</span>
      Delete
    </button>
  
    </div>
  `;
  const categoryEl = card.querySelector(".category-pill");

  categoryEl.addEventListener("click", (e) => {
    e.stopPropagation();
    openCategoryPicker(taskId, e);
  });
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

    const projectId = getCurrentProject();
    if (!projectId) return;
    await updateDoc(
      doc(db, "users", uid, "projects", projectId, "tasks", taskId),
      { urgency: next, lastModified: Timestamp.now() },
    );
  });

  const deleteBtn = card.querySelector(".delete-task-btn");

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // don’t toggle card

    openDeleteTaskModal(taskId);
    newTaskBtn;
  });

  const taskNotesBtn = card.querySelector(".task-notes-btn");

  taskNotesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log(taskId);
    openNotesModal(taskId, null);
  });

  const details = card.querySelector(".task-details");
  const meta = card.querySelector(".task-meta");
  const topDiv = card.querySelector(".top-card-container");
  let subtasksRendered = false;

  card.addEventListener("click", () => {
    const open = !details.classList.contains("hidden");

    if (open && openTaskId === taskId && checkboxClicked !== true) {
      console.log("in card close");
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
  const metaCount = card.querySelector(".progress-meta");
  console.log(task.subtasks.length ? "show" : "hide");

  const done = countDone(task);
  const total = task.subtasks?.length || 0;
  console.log("total", total);
  metaCount.textContent = "";

  const label = document.createElement("span");
  label.textContent = `subtasks`;

  const count = document.createElement("span");
  count.textContent = `${done}/${total}`;

  metaCount.append(label, count);
  if (total && done === total) {
    bar.classList.add("complete");
    setTimeout(() => bar.classList.remove("complete"), 600);
  }
  bar.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;

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
  const categoryEl = card.querySelector(".category-pill");

  if (
    prev?.category?.name !== task.category?.name ||
    prev?.category?.color !== task.category?.color
  ) {
    const cat = task.category || { name: "General", color: "#444" };

    categoryEl.textContent = cat.name.toUpperCase();
    categoryEl.style.color = cat.color;
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

    console.log("checkbox cliced condition");
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
  const projectId = getCurrentProject();
  if (!projectId) {
    console.warn("Subtask update blocked: no active project");
    return;
  }

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
    if (s.completed) {
      row.classList.add("completed");
    }
    row.innerHTML = `
    <div class = "checkbox-date-div">
    <div class = "checkbox-div">
    <label class="container">
  <input type="checkbox" ${s.completed ? "checked" : ""} />
  <span class="checkmark"></span>
</label>
      
      <div class = "subtask-text">
      <span>${s.text}</span>
     
   
      </div>
      </div>
      </div>
      <div class = "subtasks-row-actions"> 
      <button class="subtask-notes-btn" aria-label="Open subtask notes">
  <span class="material-symbols-outlined">article</span>
  <span  class = "subtask-note-text">Notes</span>
</button>
      <div class ="delete-div">
  <button class= "subtask-delete-btn" aria-label="Delete">
    <span class="material-symbols-outlined">close</span>
      <span  class = "subtask-delete-text">Delete</span>
  </button>
      </div>
      </div>
    `;

    const checkboxdateDiv = row.querySelector(".checkbox-date-div");
    const checkboxDiv = checkboxdateDiv.querySelector(".checkbox-div");
    const checkbox = checkboxDiv.querySelector("input");
    const subtaskNotesWrapper = checkboxDiv.querySelector(".subtask-notes");
    console.log(subtaskNotesWrapper);

    const notesBtn = row.querySelector(".subtask-notes-btn");

    notesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("s id ", s.id);
      openNotesModal(taskId, s.id);
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

      await updateDoc(
        doc(db, "users", uid, "projects", projectId, "tasks", taskId),
        { subtasks: updatedSubtasks, lastModified: Timestamp.now() },
      );
    };

    checkbox.onclick = (e) => e.stopPropagation();
    console.log(taskStore);
    prevSnapshot = JSON.parse(JSON.stringify(taskStore.get(taskId)));
    checkbox.onchange = async () => {
      checkboxClicked = true;
      s.completed = checkbox.checked;

      row.classList.toggle("completed", checkbox.checked);

      s.completed = checkbox.checked;
      await updateDoc(
        doc(db, "users", uid, "projects", projectId, "tasks", taskId),
        { subtasks: task.subtasks, lastModified: Timestamp.now() },
      );
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
      console.log("card", card);
      const text = input.value.trim();
      if (!text) return;

      const projectId = getCurrentProject();
      if (!projectId) return;

      await updateDoc(
        doc(db, "users", uid, "projects", projectId, "tasks", taskId),
        {
          subtasks: arrayUnion({
            id: crypto.randomUUID(),
            text,
            completed: false,
            createdAt: Timestamp.now(),
          }),
          lastModified: Timestamp.now(),
        },
      );

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
    if (card) col.prepend(card);
  });

  col.addEventListener("drop", async () => {
    const card = document.querySelector(".dragging");

    if (!card) return;
    if (card.classList.contains("project-card")) {
      const uid = getUID();
      if (!uid) return;

      console.log(card.dataset.id);
      console.log(col.id);
      console.log(uid);
      await updateDoc(doc(db, "users", uid, "projects", card.dataset.id), {
        status: col.id,
        lastModified: Timestamp.now(),
      });
      return;
    }
    const projectId = getCurrentProject();
    if (!projectId) return;
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
    await updateDoc(
      doc(db, "users", uid, "projects", projectId, "tasks", taskId),
      { status: col.id, lastModified: Timestamp.now() },
    );
  });
});
let tempSubtasks = []; // holds modal subtasks
/* ---------------------
   ADD TASK MODAL (RESTORED)
--------------------- */
document.getElementById("newTaskBtn")?.addEventListener("click", () => {
  if (getKanbanMode() === "root") return;

  openTaskModal();
  const addBtn = document.getElementById("addSubtaskBtn");
  const subtaskList = document.getElementById("subtaskList");

  addBtn.onclick = (e) => {
    e.stopPropagation();

    if (subtaskList.querySelector(".new-subtask-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "new-subtask-wrapper";

    const input = document.createElement("input");
    input.className = "new-subtask-input";
    input.placeholder = "New subtask…";

    const submitBtn = document.createElement("button");

    submitBtn.className = "subtask-add-btn";
    const submiticon = document.createElement("span");
    submiticon.className = "material-symbols-outlined";
    submiticon.textContent = "check";
    submitBtn.append(submiticon);
    const cancelBtn = document.createElement("button");
    const cancelIcon = document.createElement("span");
    cancelIcon.className = "material-symbols-outlined";
    cancelIcon.textContent = "close";

    cancelBtn.className = "subtask-cancel-btn";
    cancelBtn.append(cancelIcon);
    wrapper.append(input, submitBtn, cancelBtn);

    subtaskList.appendChild(wrapper); // 🔥 append to list

    input.focus();

    const submit = () => {
      const text = input.value.trim();
      if (!text) return;

      tempSubtasks.push({
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: Timestamp.now(),
      });

      wrapper.remove();
      renderTempSubtasks(subtaskList);
    };

    submitBtn.onclick = submit;
    cancelBtn.onclick = () => wrapper.remove();
    input.onkeydown = (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") wrapper.remove();
    };
  };
});

function openTaskModal() {
  tempSubtasks = [];
  activeTaskId = null;
  document.getElementById("taskModal").classList.remove("hidden");
  document.getElementById("taskTitleInput").value = "";
}

function renderTempSubtasks(list) {
  list.innerHTML = "";
  tempSubtasks.forEach((subtask, index) => {
    const div = document.createElement("div");
    const cancelIcon = document.createElement("span");
    cancelIcon.className = "material-symbols-outlined";
    cancelIcon.textContent = "close";

    div.className = "modal-subtask";
    div.textContent = subtask.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "modal-subtask-btn-delete";

    deleteBtn.onclick = () => {
      tempSubtasks.splice(index, 1);
      renderTempSubtasks(list);
    };
    deleteBtn.append(cancelIcon);
    div.appendChild(deleteBtn);
    list.appendChild(div);
  });
}
document.getElementById("saveTaskBtn")?.addEventListener("click", async () => {
  const titleInput = document.getElementById("taskTitleInput");
  const title = titleInput?.value.trim();

  if (!title) return alert("Task needs a title");

  const projectId = getCurrentProject();

  if (!projectId) return alert("No active project");

  await addDoc(collection(db, "users", uid, "projects", projectId, "tasks"), {
    title,
    urgency: selectedPriority,
    status: "todo",
    category: {
      name: "Work",
      color: "#3b82f6",
    },
    subtasks: tempSubtasks,
    createdAt: Timestamp.now(),
    lastModified: Timestamp.now(),
  });

  closeModal();
});

document.getElementById("cancelTaskBtn")?.addEventListener("click", closeModal);

function closeModal() {
  const subtaskList = document.getElementById("subtaskList");
  subtaskList.innerHTML = "";
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
    const projectId = getCurrentProject();

    try {
      await deleteDoc(
        doc(db, "users", uid, "projects", projectId, "tasks", taskToDeleteId),
      );
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
    let projectId = getCurrentProject();
    if (!pendingDoneTaskId) return;
    console.log(pendingDoneTaskId, "pedning done task id");
    try {
      await updateDoc(
        doc(
          db,
          "users",
          uid,
          "projects",
          projectId,
          "tasks",
          pendingDoneTaskId,
        ),
        {
          status: "done",
          lastModified: Timestamp.now(),
        },
      );
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
  });
});

// js/tasks.js
export function clearTasksUI() {
  const columns = ["todo", "started", "inprogress", "done"];

  columns.forEach((id) => {
    const col = document.getElementById(id);
    if (col) col.innerHTML = "";
  });

  // reset counters
  const counts = {
    todo: "count-todo",
    started: "count-started",
    inprogress: "count-inprogress",
    done: "count-done",
  };

  Object.values(counts).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "0";
  });
}
const STORAGE_KEY = "theme";
function projectRef(uid, projectId) {
  return doc(db, "users", uid, "projects", projectId);
}

function taskRef(uid, taskId) {
  const projectId = getCurrentProject();
  if (!projectId) throw new Error("No active project");
  return doc(db, "users", uid, "projects", projectId, "tasks", taskId);
}
function applyCurrentSort() {
  console.log("in apply ");
  const containerMap = {
    todo: document.getElementById("todo"),
    started: document.getElementById("started"),
    inprogress: document.getElementById("inprogress"),
    done: document.getElementById("done"),
  };

  Object.entries(containerMap).forEach(([status, container]) => {
    if (!container) return;

    const cards = [...container.querySelectorAll(".card")];

    // Build category counts for this container (optional: use all tasks if preferred)
    const tasksInContainer = cards.map((card) =>
      taskStore.get(card.dataset.id),
    );

    const categoryCounts = getCategoryCounts(tasksInContainer);

    cards.sort((a, b) => {
      const taskA = taskStore.get(a.dataset.id);
      const taskB = taskStore.get(b.dataset.id);

      return compareValues(
        taskA,
        taskB,
        currentSort.field,
        currentSort.direction,
        categoryCounts, // pass the map here
      );
    });

    // Reattach sorted cards
    cards.forEach((card) => container.appendChild(card));
  });
}

function initTaskPage() {
  const sortBtn = document.getElementById("sortBtn");
  const sortDropdown = document.getElementById("sortDropdown");

  if (!sortBtn || !sortDropdown) return;

  sortBtn.addEventListener("click", () => {
    sortDropdown.classList.toggle("hidden");
  });
}

initTaskPage();
function buildSortDropdown() {
  const dropdown = document.getElementById("sortDropdown");
  dropdown.innerHTML = "";

  const fields = getAvailableSortFields();

  fields.forEach((field) => {
    const option = document.createElement("div");
    option.className = "sort-option";
    option.textContent = `Sort by ${field}`;

    option.addEventListener("click", () => {
      currentSort = {
        field,
        direction: "desc",
      };
      setSortPreference(page, currentSort);

      applyCurrentSort();
      dropdown.classList.add("hidden");
    });

    dropdown.appendChild(option);
  });
}
function getAvailableSortFields() {
  const first = [...taskStore.values()][0];
  if (!first) return [];

  const blacklist = ["subtasks", "notes"];

  return Object.keys(first).filter((key) => !blacklist.includes(key));
}
let notesDraft = {};
function openNotesModal(taskId, subtaskId) {
  activeTaskId = taskId;
  activeSubtaskId = subtaskId;

  const task = taskStore.get(taskId);
  const modal = document.getElementById("notesModal");
  const tabs = document.getElementById("notesTabs");

  notesDraft = {};

  // Task notes
  notesDraft["task"] = task?.notes || "";

  // Subtask notes
  task.subtasks?.forEach((s) => {
    notesDraft[s.id] = s.notes || "";
  });
  tabs.innerHTML = "";

  // Parent task tab
  createNotesTab("Task", null, task?.notes || "", subtaskId);

  // Subtask tabs
  task.subtasks?.forEach((s) => {
    createNotesTab(s.text, s.id, s.notes || "", subtaskId);
  });

  modal.classList.remove("hidden");

  selectTab(subtaskId);
}
function createNotesTab(title, subtaskId, notes, activeTab) {
  const tab = document.createElement("button");
  tab.className = "notes-tab";
  tab.textContent = title;

  tab.dataset.subtaskId = subtaskId ?? "task";

  const tabsContainer = document.getElementById("notesTabs");
  if (activeTab === subtaskId) {
    tab.classList.add("active-tab");
  } else if (!activeTab) {
    document.querySelector(".notes-tab")?.classList.add("active-tab");
  }
  tab.addEventListener("click", () => {
    const textarea = document.getElementById("noteContent");

    // Save current tab's content BEFORE switching
    const currentKey = activeSubtaskId ?? "task";
    notesDraft[currentKey] = textarea.value;

    // Switch active tab UI
    tabsContainer
      .querySelectorAll(".notes-tab")
      .forEach((t) => t.classList.remove("active-tab"));

    tab.classList.add("active-tab");

    selectTab(subtaskId);
  });
  document.getElementById("notesTabs").appendChild(tab);
}
function selectTab(subtaskId) {
  activeSubtaskId = subtaskId;

  const task = taskStore.get(activeTaskId);

  const textarea = document.getElementById("noteContent");
  const noteCreated = document.getElementById("noteCreated");
  const noteEdited = document.getElementById("noteEdited");

  if (subtaskId === null) {
    noteCreated.textContent = task.createdAt.toDate().toLocaleString();
    noteEdited.textContent = task.lastModified.toDate().toLocaleString();
    textarea.value = notesDraft["task"] || "";
  } else {
    const sub = task.subtasks.find((s) => s.id === subtaskId);
    noteCreated.textContent = sub.createdAt.toDate().toLocaleString();
    noteEdited.textContent = "";
    textarea.value = notesDraft[subtaskId] || "";
  }
}

const InTaskPage = document.getElementById("todo");

if (InTaskPage) {
  console.log("int aask spage event listener");
  document
    .getElementById("saveNotesBtn")
    .addEventListener("click", async () => {
      const projectId = getCurrentProject();
      const task = taskStore.get(activeTaskId);
      const currentKey = activeSubtaskId ?? "task";
      notesDraft[currentKey] = document.getElementById("noteContent").value;

      task.notes = notesDraft["task"];

      task.subtasks.forEach((s) => {
        s.notes = notesDraft[s.id] || "";
      });

      await updateDoc(
        doc(db, "users", uid, "projects", projectId, "tasks", activeTaskId),
        {
          notes: task.notes ?? "",
          subtasks: task.subtasks,
          lastModified: Timestamp.now(),
        },
      );
    });
  document.getElementById("closeNotesModal").addEventListener("click", () => {
    document.getElementById("notesModal").classList.add("hidden");
  });
}

function openCategoryPicker(taskId, event) {
  const picker = document.getElementById("categoryPicker");
  picker.innerHTML = "";

  const rect = event.target.getBoundingClientRect();
  picker.style.top = rect.bottom + "px";
  picker.style.left = rect.left + "px";

  // Existing categories
  categoryMap.forEach((cat) => {
    const option = document.createElement("div");
    option.className = "category-option";

    option.innerHTML = `
    <span class="color-dot" style="background:${cat.color}"></span>
    <span class="cat-name-text">${cat.name}</span>
    <button class="rename-cat">✎</button>
    <button class="delete-cat">🗑️</button>
  `;

    // Apply category on click of name
    option.querySelector(".cat-name-text").onclick = () => {
      setCategory(taskId, cat);
      picker.classList.add("hidden");
    };

    // Rename
    option.querySelector(".rename-cat").onclick = () => {
      const newName = prompt("Rename category:", cat.name)?.trim();
      if (!newName) return;

      const keyOld = cat.name.toLowerCase();
      const keyNew = newName.toLowerCase();

      // Update map
      categoryMap.delete(keyOld);
      categoryMap.set(keyNew, { name: newName, color: cat.color });

      // Update all tasks using this category
      renameCategoryInTasks(cat.name, newName);

      // Re-render picker
      openCategoryPicker(taskId, event);
    };

    // Delete
    option.querySelector(".delete-cat").onclick = async () => {
      if (!confirm(`Delete category "${cat.name}"?`)) return;

      const key = cat.name.toLowerCase();
      categoryMap.delete(key);

      // Remove category from tasks using it
      deleteCategoryFromTasks(cat.name);

      // Re-render picker
      openCategoryPicker(taskId, event);
    };

    picker.appendChild(option);
  });

  // ➕ Add new category UI
  const addNew = document.createElement("div");
  addNew.className = "category-new";

  addNew.innerHTML = `
    <input placeholder="New category name" class="cat-name-input"/>
    <input type="color" class="cat-color-input"/>
    <button>Add</button>
  `;

  addNew.querySelector("button").onclick = () => {
    const name = addNew.querySelector(".cat-name-input").value.trim();
    const color = addNew.querySelector(".cat-color-input").value;
    if (!name) return;

    const key = name.toLowerCase();
    const newCategory = { name, color };

    categoryMap.set(key, newCategory); // ✅ live map
    setCategory(taskId, newCategory);

    picker.classList.add("hidden");
  };

  picker.appendChild(addNew);
  picker.classList.remove("hidden");
}
async function setCategory(taskId, category) {
  const projectId = getCurrentProject();

  await updateDoc(
    doc(db, "users", uid, "projects", projectId, "tasks", taskId),
    {
      category,
      lastModified: Timestamp.now(),
    },
  );
}
document.addEventListener("click", (e) => {
  const picker = document.getElementById("categoryPicker");
  if (!picker.contains(e.target)) {
    picker.classList.add("hidden");
  }
});
async function renameCategoryInTasks(oldName, newName) {
  const projectId = getCurrentProject();

  const tasksSnapshot = await getDocs(
    collection(db, "users", uid, "projects", projectId, "tasks"),
  );

  const batch = writeBatch(db);

  tasksSnapshot.forEach((docSnap) => {
    const task = docSnap.data();
    if (task.category?.name === oldName) {
      batch.update(
        doc(db, "users", uid, "projects", projectId, "tasks", docSnap.id),
        {
          "category.name": newName,
          lastModified: Timestamp.now(),
        },
      );
    }
  });

  await batch.commit();
}

async function deleteCategoryFromTasks(name) {
  const projectId = getCurrentProject();

  const tasksSnapshot = await getDocs(
    collection(db, "users", uid, "projects", projectId, "tasks"),
  );

  const batch = writeBatch(db);

  tasksSnapshot.forEach((docSnap) => {
    const task = docSnap.data();
    if (task.category?.name === name) {
      batch.update(
        doc(db, "users", uid, "projects", projectId, "tasks", docSnap.id),
        {
          category: null,
          lastModified: Timestamp.now(),
        },
      );
    }
  });

  await batch.commit();
}
function getCategoryCounts(tasks) {
  const counts = {};
  tasks.forEach((task) => {
    console.log(task.category);
    const cat = task.category.name || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}
