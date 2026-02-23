import { stopRootKanban } from "./root-kanban.js";

let mode = localStorage.getItem("kanbanMode") || "project";
const listeners = new Set();

export function setKanbanMode(newMode) {
  if (newMode === mode) return;
  if (newMode === "project") {
    stopRootKanban(); // 🔥 THIS is the missing piece
  }
  mode = newMode;
  localStorage.setItem("kanbanMode", mode);

  listeners.forEach((cb) => cb(mode));
}

export function getKanbanMode() {
  return mode;
}

export function onKanbanModeChange(cb) {
  listeners.add(cb);
  cb(mode); // immediate sync
  return () => listeners.delete(cb);
}
