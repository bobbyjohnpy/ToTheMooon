// js/project.js
let currentProjectId = null;
const subscribers = new Set();

export function setCurrentProject(id) {
  if (id === currentProjectId) return;
  currentProjectId = id;
  subscribers.forEach((cb) => cb(currentProjectId));
}

export function getCurrentProject() {
  return currentProjectId;
}

export function onProjectChange(cb) {
  subscribers.add(cb);
  if (currentProjectId) cb(currentProjectId);
  return () => subscribers.delete(cb);
}
