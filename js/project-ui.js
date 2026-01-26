import { getProjects, createProject } from "./projects-service.js";
import { setCurrentProject } from "./project.js";
import { getUID } from "./auth.js";
import { setKanbanMode } from "./kanban-mode.js";
import { loadRootKanban } from "./root-kanban.js";

export async function populateProjectDropdown() {
  const uid = getUID();
  if (!uid) return;

  const select = document.getElementById("projectSelect");
  if (!select) return;

  const projects = await getProjects(uid);
  select.innerHTML = "";

  // 🧠 ROOT OPTION
  const rootOpt = document.createElement("option");
  rootOpt.value = "__root__";
  rootOpt.textContent = "All Projects";
  select.appendChild(rootOpt);

  projects.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  // default selection
  select.value = "__root__";
}

export function initProjectUI() {
  const select = document.getElementById("projectSelect");
  const addBtn = document.getElementById("addProjectBtn");

  select?.addEventListener("change", async () => {
    const value = select.value;
    const uid = getUID();

    if (value === "__root__") {
      setKanbanMode("root");
      await loadRootKanban(uid);
      return;
    }

    setKanbanMode("project");
    setCurrentProject(value);
  });

  addBtn?.addEventListener("click", async () => {
    const name = prompt("Project name?");
    if (!name) return;

    const uid = getUID();
    const projectId = await createProject(uid, name);

    await populateProjectDropdown();
    select.value = projectId;

    setKanbanMode("project");
    setCurrentProject(projectId);
  });
}
