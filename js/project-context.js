// js/project-context.js
// Single source of truth for active project context
// Manages activeProjectId with localStorage persistence

let activeProjectId = null;
let projectChangeCallbacks = [];

const STORAGE_KEY = "founder-os-activeProjectId";

/**
 * Initialize project context from localStorage or use first project ID
 * @param {string} defaultProjectId - Fallback project ID if none stored
 */
export function initProjectContext(defaultProjectId) {
  const stored = localStorage.getItem(STORAGE_KEY);
  activeProjectId = stored || defaultProjectId;

  if (activeProjectId) {
    localStorage.setItem(STORAGE_KEY, activeProjectId);
  }

  return activeProjectId;
}

/**
 * Get current active project ID
 * @returns {string | null}
 */
export function getActiveProjectId() {
  return activeProjectId;
}

/**
 * Set active project and trigger callbacks
 * @param {string} projectId
 */
export function setActiveProjectId(projectId) {
  if (!projectId) return;

  activeProjectId = projectId;
  localStorage.setItem(STORAGE_KEY, projectId);

  // Trigger all listeners (page re-renders)
  projectChangeCallbacks.forEach((cb) => cb(projectId));
}

/**
 * Subscribe to project changes
 * @param {Function} callback - Called with new projectId when active project changes
 * @returns {Function} - Unsubscribe function
 */
export function onProjectChange(callback) {
  projectChangeCallbacks.push(callback);

  return () => {
    projectChangeCallbacks = projectChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

/**
 * Clear all stored context (for testing or logout)
 */
export function clearProjectContext() {
  activeProjectId = null;
  localStorage.removeItem(STORAGE_KEY);
  projectChangeCallbacks = [];
}
