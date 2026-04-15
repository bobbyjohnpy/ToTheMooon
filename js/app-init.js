// js/app-init.js
import { loadLayout } from "./layout.js";
import { initNav } from "./nav.js";
import { initAuthUI } from "./auth-ui.js";
import { initAuth, onAuthReady, getUID } from "./auth.js";
import { clearTasksUI } from "./tasks.js";
import { initThemeToggle } from "./theme.js";
import { initProjectTasks } from "./tasks.js";
import { initProjectUI, populateProjectDropdown } from "./project-ui.js";
import { ensureFirstProject } from "./projects-service.js";
import { loadRootKanban } from "./root-kanban.js";
import { getKanbanMode, setKanbanMode } from "./kanban-mode.js";
import { getCurrentProject, setCurrentProject } from "./project.js";
import { subscribeNotes, onNotesChange, createNote } from "./notes-service.js";
import { initNotesUI } from "./notes-ui.js";
let lastLoadedUID = null;

(async function initApp() {
  // 1️⃣ Load global layout
  await loadLayout(); // Loads html for nav and auth

  // 2️⃣ Init nav
  initNav(); // breadcrumbs

  // 3️⃣ Init auth UI (THIS makes sign-in button work)
  initAuthUI();

  // 4️⃣ Start Firebase auth (anon → upgrade flow)
  initAuth();
  initThemeToggle(); // 🔥 AFTER layout
  // 5️⃣ React to auth state changes

  onAuthReady(async (user) => {
    if (user.uid === lastLoadedUID) return;
    lastLoadedUID = user.uid;

    const firstProjectId = await ensureFirstProject(user.uid);
    await populateProjectDropdown(user.uid);
    initProjectUI();
    let InNotesPage = document.querySelector(".notes-grid");
    if (InNotesPage) {
      console.log("in notes page");
      initNotesUI();
    }

    // Start initial subscription

    if (!document.getElementById("todo")) return;

    clearTasksUI();
    initProjectTasks(user.uid);

    const mode = getKanbanMode();
    const projectId = getCurrentProject();

    if (mode === "root") {
      setKanbanMode("root");
      loadRootKanban(user.uid);
    } else {
      const id = projectId || firstProjectId;
      setKanbanMode("project");
      setCurrentProject(id);
    }
  });

  // 6️⃣ Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js");
    });
  }
})();
window.addEventListener("enter-project", (e) => {
  const projectId = e.detail;
  const uid = getUID();
  if (!uid || !projectId) return;

  setKanbanMode("project");
  setCurrentProject(projectId);
});
