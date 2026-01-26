import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { clearTasksUI } from "./tasks.js";
import { setKanbanMode } from "./kanban-mode.js";
let unsubscribe = null;
export function loadRootKanban(uid) {
  if (!uid) return;
  console.log("inload root kanban");
  if (unsubscribe) unsubscribe();

  clearTasksUI();

  const ref = collection(db, "users", uid, "projects");

  unsubscribe = onSnapshot(ref, (snap) => {
    clearTasksUI();

    snap.forEach((d) => {
      const project = d.data();
      const status = project.status || "todo";
      console.log("card render");
      document
        .getElementById(status)
        ?.appendChild(renderProjectCard(uid, d.id, project));
    });

    updateCounts();
  });
}

function renderProjectCard(uid, projectId, project) {
  const card = document.createElement("div");
  card.className = "card project-card priority-medium";
  card.draggable = true;
  card.dataset.id = projectId;

  const total = project.taskCount || 0;
  const done = project.doneCount || 0;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const urgency = project.urgency || "medium";
  card.classList.add(`priority-${urgency}`);
  card.innerHTML = `
    <div class="top-card-container">
     
     
  
    </div>
     <div class="task-header">
        <h4>${project.name}</h4>
      </div>
       <div class="progress-meta">
        <span>${total} tasks</span>
        <span>${done}/${total}</span>
      </div>
    <div class="progress">
        <div
          class="progress-bar ${progress === 100 ? "complete" : ""}"
          style="width: ${progress}%"
        ></div>
      </div>


    <div class="priority-div">
      <div class="priority ${project.urgency || "medium"}">
    ${(project.urgency || "medium").toUpperCase()}
  </div>
    </div>
  `;
  const priorityEl = card.querySelector(".priority");

  priorityEl.addEventListener("click", async (e) => {
    e.stopPropagation(); // prevent entering project
    if (project.status === "done") {
      priorityEl.className = "priority done";
      priorityEl.textContent = "DONE";
    }

    const current = project.urgency || "medium";
    const next = getNextPriority(current);

    await updateDoc(doc(db, "users", uid, "projects", projectId), {
      urgency: next,
    });
  });

  // 🔑 ENTER PROJECT

  enableProjectDrag(uid, card);
  return card;
}
const PRIORITY_ORDER = ["low", "medium", "high"];
function getNextPriority(current) {
  const idx = PRIORITY_ORDER.indexOf(current);
  return PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
}
function enableProjectDrag(uid, card) {
  card.addEventListener("dragstart", () => card.classList.add("dragging"));

  card.addEventListener("dragend", () => card.classList.remove("dragging"));
}

function updateCounts() {
  ["todo", "started", "inprogress", "done"].forEach((id) => {
    const count = document.getElementById(id).children.length;
    document.getElementById(`count-${id}`).textContent = count;
  });
}
// root-kanban.js
