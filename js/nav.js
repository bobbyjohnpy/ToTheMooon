import {
  getActiveProjectId,
  setActiveProjectId,
  onProjectChange,
} from "./project-context.js";

export function injectNav(active) {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <nav>
      <a href="index.html" class="${
        active === "dashboard" ? "active" : ""
      }">Dashboard</a>
      <a href="track.html" class="${
        active === "track" ? "active" : ""
      }">Track</a>
      <a href="tasks.html" class="${
        active === "tasks" ? "active" : ""
      }">Tasks</a>
      <a href="notes.html" class="${
        active === "notes" ? "active" : ""
      }">Notes</a>
      <a href="progress.html" class="${
        active === "progress" ? "active" : ""
      }">Progress</a>
      <select id="projectSwitcher" style="display:none;"></select>
      <button id="logoutBtn" onclick="logout()" style="display:none;">Log out</button>
    </nav>
    `
  );

  setupProjectSwitcher();
}

export function updateProjectSwitcher(projects) {
  const switcher = document.getElementById("projectSwitcher");
  if (!switcher) return;

  const activeId = getActiveProjectId();
  switcher.innerHTML = "";

  // Add "All Projects" option
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Projects";
  allOption.selected = !activeId;
  switcher.appendChild(allOption);

  // Add project options
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    option.selected = activeId === project.id;
    switcher.appendChild(option);
  });

  switcher.style.display = "block";
}

function setupProjectSwitcher() {
  const switcher = document.getElementById("projectSwitcher");
  if (!switcher) return;

  switcher.addEventListener("change", (e) => {
    const projectId = e.target.value;
    if (projectId) {
      setActiveProjectId(projectId);
    }
    // Reload current page to apply project context
    window.location.reload();
  });
}
