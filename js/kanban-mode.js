let mode = "project"; // default

const listeners = new Set();

export function setKanbanMode(newMode) {
  if (newMode === mode) return;
  mode = newMode;
  listeners.forEach((cb) => cb(mode));
}

export function getKanbanMode() {
  return mode;
}

export function onKanbanModeChange(cb) {
  listeners.add(cb);
  cb(mode);
  return () => listeners.delete(cb);
}
