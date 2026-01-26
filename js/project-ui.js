import { getProjects, createProject } from "./projects-service.js";
import { setCurrentProject } from "./project.js";
import { getUID } from "./auth.js";

export async function populateProjectDropdown() {
  const uid = getUID();
  if (!uid) return;

  const select = document.getElementById("projectSelect");
  if (!select) return;

  const projects = await getProjects(uid);
  select.innerHTML = "";

  projects.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  if (projects.length) {
    setCurrentProject(projects[0].id);
    select.value = projects[0].id;
  }
}

export function initProjectUI() {
  const select = document.getElementById("projectSelect");
  const addBtn = document.getElementById("addProjectBtn");

  select?.addEventListener("change", () => {
    setCurrentProject(select.value);
  });

  addBtn?.addEventListener("click", async () => {
    const name = prompt("Project name?");
    if (!name) return;

    const uid = getUID();
    const projectId = await createProject(uid, name);

    await populateProjectDropdown();
    setCurrentProject(projectId);
  });
}
