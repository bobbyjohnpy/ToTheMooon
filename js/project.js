import { clearTasksUI } from "./tasks.js";
import { getKanbanMode } from "./kanban-mode.js";
let currentProjectId = localStorage.getItem("currentProjectId");
const subscribers = new Set();

export function setCurrentProject(id) {
  const mode = getKanbanMode();
  console.log("id", id + "=" + "current project id ", currentProjectId);
  if (mode === "project" && id === currentProjectId) return;

  currentProjectId = id;
  localStorage.setItem("currentProjectId", id);

  // leaving root mode
  localStorage.setItem("kanbanMode", "project");

  subscribers.forEach((cb) => cb(currentProjectId));
}

export function getCurrentProject() {
  return currentProjectId;
}

export function clearCurrentProject() {
  currentProjectId = null;
  localStorage.removeItem("currentProjectId");
}

export function onProjectChange(cb) {
  subscribers.add(cb);
  clearTasksUI();
  console.log("project id", currentProjectId);
  if (currentProjectId) cb(currentProjectId);
  return () => subscribers.delete(cb);
}
