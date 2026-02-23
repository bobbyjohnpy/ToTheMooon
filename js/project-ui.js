import { getProjects, createProject } from "./projects-service.js";
import { setCurrentProject, getCurrentProject } from "./project.js";
import { getUID } from "./auth.js";
import { getKanbanMode, setKanbanMode } from "./kanban-mode.js";
import { loadRootKanban } from "./root-kanban.js";
import { clearTasksUI } from "./tasks.js";

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
  const AddOpt = document.createElement("option");
  AddOpt.value = "addprojectoption";
  AddOpt.textContent = "add project +";
  AddOpt.id = "addProjectBtn";
  select.appendChild(AddOpt);

  // default selection
  select.value = "__root__";
}

export function initProjectUI() {
  const select = document.getElementById("projectSelect");
  const addBtn = document.getElementById("addProjectBtn");
  if (!select) return;

  const uid = getUID();

  // 🔄 Restore selection on load
  const mode = getKanbanMode();
  const currentProject = getCurrentProject();

  if (mode === "root") {
    select.value = "__root__";
  } else if (currentProject) {
    select.value = currentProject;
  }

  // 🔁 Handle dropdown change
  select.addEventListener("change", async () => {
    const value = select.value;

    if (value === "__root__") {
      setKanbanMode("root");
      console.log("root mode");

      // Only load kanban if tasks page exists
      if (document.getElementById("todo")) {
        await loadRootKanban(uid);
      }
      return;
    }
    console.log("project");

    setCurrentProject(value);
    setKanbanMode("project");
  });

  // ➕ Add project
  console.log("add button", addBtn);
  select.addEventListener("change", async (e) => {
    if (e.target.value === "addprojectoption") {
      const name = prompt("Project name?");
      if (!name) return;

      const { createProject } = await import("./projects-service.js");
      const { populateProjectDropdown } = await import("./project-ui.js");

      const projectId = await createProject(uid, name);

      await populateProjectDropdown(uid);
      select.value = projectId;

      setKanbanMode("project");
      setCurrentProject(projectId);
    }
  });
}
