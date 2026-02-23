import {
  onNotesChange,
  createNote,
  updateNote,
  deleteNote,
  subscribeNotes,
} from "./notes-service.js";

let notesGrid;
let modal, titleInput, contentInput, categoryInput, saveBtn, deleteBtn;
let activeNoteId = null;
let optionClicking = false;
let enterCommitted = false;
let activeCategory = { name: "General", color: "#6b7280" };

const categoryCache = new Map();
// name → color (for dropdown reuse)
export function initNotesUI() {
  notesGrid = document.querySelector(".notes-grid");
  console;
  if (!notesGrid) {
    console.log("no notres grid");
    return;
  }

  injectModal();
  wireModal();

  onNotesChange(renderNotes);
  subscribeNotes();

  document.querySelector(".new-note-btn")?.addEventListener("click", () => {
    openModal({
      id: null,
      title: "",
      content: "",
      category: "General",
    });
  });
}

// ───────── RENDER ─────────
function renderNotes(notes) {
  notesGrid.innerHTML = "";
  categoryCache.clear();

  notes.forEach((note) => {
    // Cache categories
    if (note.category?.name) {
      categoryCache.set(note.category.name, note.category.color || "#6b7280");
    }

    const card = document.createElement("div");
    card.className = "note-card";

    card.innerHTML = `
     <span 
  class="tag"
  style="background:${note.category?.color || "#6b7280"}20;
         color:${note.category?.color || "#6b7280"};
         border:1px solid ${note.category?.color || "#6b7280"}40">
  ${note.category?.name || "General"}
</span>
      <h3>${note.title}</h3>
      <p>${note.content.slice(0, 100)}</p>
      <div class="note-footer">
        ${formatDate(note.updatedAt)}
              <span class = "material-symbols-outlined delete-span">delete</span>
      </div>

    `;

    card.addEventListener("click", (e) => {
      e.stopPropagation();
      animateExpand(card, note);
    });

    notesGrid.appendChild(card);
  });

  renderAddCard();
}

function renderAddCard() {
  const add = document.createElement("div");
  add.className = "note-card add-card";
  add.innerHTML = `<div class="plus">＋</div><p>Add Note</p>`;
  add.onclick = () =>
    openModal({ id: null, title: "", content: "", category: "General" });
  notesGrid.appendChild(add);
}

function formatDate(ts) {
  if (!ts?.toDate) return "just now";
  return "Edited " + ts.toDate().toLocaleString();
}

function injectModal() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
<div class="note-modal hidden">
  <div class="note-modal-content">

    <!-- Header -->
    <div class="modal-header">
      <div class="modal-breadcrumb">
        Projects / Apollo Redesign / <span>Editing Note</span>
      </div>

    <div class="modal-header-actions">
  <span class="autosave">Auto-saved just now</span>
  <label class="autosave-toggle">
    Auto-save
    <input type="checkbox" class="autosave-checkbox" checked />
    <span class="slider"></span>
  </label>
  <span class = "material-symbols-outlined delete-span">delete</span>
  <button class="close-btn">✕</button>
</div>
    </div>

    <div class="modal-layout">

      <!-- Left Editor -->
      <div class="modal-editor">
        <input class="modal-title" placeholder="Untitled Note" />

        <div class="modal-category-wrapper">
  <div class="modal-category-pill"></div>

  <div class="category-editor hidden">
    <input class="category-input" placeholder="Category name" />
    <input type="color" class="category-color" />
    <div class="category-dropdown"></div>
  </div>
</div>

        <textarea class="modal-body"
          placeholder="Start writing..."></textarea>

        <div class="modal-footer">
          <button class="ghost-btn discard-btn">Discard</button>
          <button class="primary-btn save-btn">Save Changes</button>
        </div>
      </div>

      <!-- Right Metadata -->
      <div class="modal-sidebar">

        <div class="meta-section">
          <div class="meta-label">LINKED PROJECT</div>
          <div class="meta-box">Apollo Redesign</div>
        </div>

        <div class="meta-section">
          <div class="meta-label">METADATA</div>
          <div class="meta-row">
            <span>Created</span>
            <span class="created-at"></span>
          </div>
          <div class="meta-row">
            <span>Last Edited</span>
            <span class="last-edited"></span>
          </div>
        </div>

      </div>
    </div>

  </div>
</div>
`,
  );
}

function wireModal() {
  modal = document.querySelector(".note-modal");

  titleInput = modal.querySelector(".modal-title");
  contentInput = modal.querySelector(".modal-body");
  saveBtn = modal.querySelector(".save-btn");

  const closeBtn = modal.querySelector(".close-btn");

  const pill = modal.querySelector(".modal-category-pill");
  const editor = modal.querySelector(".category-editor");
  const nameInput = modal.querySelector(".category-input");
  const colorInput = modal.querySelector(".category-color");
  const dropdown = modal.querySelector(".category-dropdown");
  const modalContent = document.querySelector(".note-modal-content");
  const autoSaveCheckbox = modal.querySelector(".autosave-checkbox");
  const autoSaveLabel = modal.querySelector(".autosave");
  let autoSaveEnabled = autoSaveCheckbox.checked;

  autoSaveCheckbox.addEventListener("change", () => {
    autoSaveEnabled = autoSaveCheckbox.checked;
    autoSaveLabel.textContent = autoSaveEnabled
      ? "Auto-save ON"
      : "Auto-save OFF";
  });

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) closeModal();
  });

  // 🟣 PILL CLICK → EDIT CATEGORY
  pill.addEventListener("click", () => {
    console.log(
      "pill clicked - before editor show",
      editor.classList.contains("hidden"),
    );
    pill.classList.add("hidden");
    editor.classList.remove("hidden");
    console.log(
      "pill clicked - after editor show",
      editor.classList.contains("hidden"),
    );

    renderCategoryDropdown(dropdown);
    setTimeout(() => nameInput.focus(), 0);
  });

  // ENTER key commits and closes editor
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      let name = nameInput.value;
      let color = colorInput.value;
      activeCategory = { name, color };
      commitCategoryEdit(activeCategory);
      nameInput.blur();
    }
  });

  // BLUR commits only if focus moves outside editor
  nameInput.addEventListener("blur", (e) => {
    const next = e.relatedTarget;
    if (!editor.contains(next)) {
      let name = nameInput.value;
      let color = colorInput.value;
      activeCategory = { name, color };
      commitCategoryEdit(activeCategory);
    }
  });

  // COLOR input live update
  colorInput.addEventListener("input", () => {
    console.log("color input");
    renderCategoryPill({
      name: nameInput.value || activeCategory.name,
      color: colorInput.value,
    });
  });

  // STOP propagation so outside click does not trigger auto-save immediately
  editor.addEventListener("mousedown", (e) => e.stopPropagation());
  dropdown.addEventListener("mousedown", (e) => e.stopPropagation());

  saveBtn.addEventListener("click", async () => {
    await saveNote();
    closeModal();
  });

  // 🔴 AUTO-SAVE ON OUTSIDE CLICK
  document.addEventListener("click", async (e) => {
    console.log("inside of document listener");
    // Exit if modal is hidden or auto-save is off
    if (modal.classList.contains("hidden")) {
      console.log("if modal is hidden");
      return;
    }
    if (!autoSaveEnabled) {
      console.log("autoSavenot envales");
      return;
    }

    // Exit if click is inside the modal at all
    if (modalContent.contains(e.target)) {
      console.log("if click is inside of modal");
      return;
    }

    // Only commit category if editor is open AND click is outside modal
    if (!editor.classList.contains("hidden")) {
      console.log("insdie document listeners");
      let name = nameInput.value;
      let color = colorInput.value;
      activeCategory = { name, color };
      commitCategoryEdit(activeCategory);
    }

    await saveNote();
  });

  async function saveNote() {
    const payload = {
      title: titleInput.value,
      content: contentInput.value,
      category: activeCategory,
    };

    if (activeNoteId) {
      await updateNote(activeNoteId, payload);
    } else {
      const newId = await createNote(payload);
      activeNoteId = newId;
    }

    autoSaveLabel.textContent = "Auto-saved just now";
    console.log("Note saved", payload);
  }
}
function openModal(note) {
  const lastEdited = modal.querySelector(".last-edited");
  const createdAtEl = modal.querySelector(".created-at");

  const pill = modal.querySelector(".modal-category-pill");
  const editor = modal.querySelector(".category-editor");

  activeNoteId = note.id || null;
  titleInput.value = note.title || "";
  contentInput.value = note.content || "";

  activeCategory =
    typeof note.category === "object"
      ? note.category
      : { name: "General", color: "#6b7280" };

  renderCategoryPill(activeCategory);

  // 🔴 RESET CATEGORY UI
  editor.classList.add("hidden");
  pill.classList.remove("hidden");

  // Safe timestamps
  if (note.updatedAt?.toDate) {
    lastEdited.textContent = note.updatedAt.toDate().toLocaleString();
  } else {
    lastEdited.textContent = "Just now";
  }

  if (note.createdAt?.toDate) {
    createdAtEl.textContent = note.createdAt.toDate().toLocaleString();
  } else {
    createdAtEl.textContent = "Just now";
  }

  modal.classList.remove("hidden");
}
function closeModal() {
  const modalContent = document.querySelector(".note-modal-content");
  const data = modalContent.dataset.expandedFrom;
  document.querySelector(".notes-grid")?.classList.remove("modal-open");
  if (!data) {
    modal.classList.add("hidden");
    activeNoteId = null;
    return;
  }

  const { deltaX, deltaY, startScale } = JSON.parse(data);

  modalContent.style.transition =
    "transform 360ms cubic-bezier(0.4, 0, 0.2, 1)";

  // Reverse transform
  modalContent.style.transform = `
    translate(-50%, -50%)
    translate(${deltaX}px, ${deltaY}px)
    scale(${startScale})
  `;

  setTimeout(() => {
    modal.classList.add("hidden");
    modalContent.style.transform = "";
    modalContent.style.transition = "";
    modalContent.style.position = "";
    modalContent.dataset.expandedFrom = "";
    activeNoteId = null;
  }, 360);
}
function animateExpand(card, note) {
  const rect = card.getBoundingClientRect();

  openModal(note);
  document.querySelector(".notes-grid")?.classList.add("modal-open");
  const modalContent = document.querySelector(".note-modal-content");

  const modalWidth = 700;
  const modalHeight = 500; // approx target height

  const cardCenterX = rect.left + rect.width / 2;
  const cardCenterY = rect.top + rect.height / 2;

  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;

  const deltaX = cardCenterX - viewportCenterX;
  const deltaY = cardCenterY - viewportCenterY;

  const scaleX = rect.width / modalWidth;
  const scaleY = rect.height / modalHeight;
  const startScale = Math.min(scaleX, scaleY);

  modalContent.style.position = "fixed";
  modalContent.style.top = "50%";
  modalContent.style.left = "50%";
  modalContent.style.transformOrigin = "center center";

  // START STATE (card)
  modalContent.style.transform = `
    translate(-50%, -50%)
    translate(${deltaX}px, ${deltaY}px)
    scale(${startScale})
  `;

  modalContent.style.transition =
    "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";

  modalContent.getBoundingClientRect();

  requestAnimationFrame(() => {
    // END STATE (modal)
    modalContent.style.transform = "translate(-50%, -50%) scale(1)";
  });

  modalContent.dataset.expandedFrom = JSON.stringify({
    deltaX,
    deltaY,
    startScale,
  });
}
function renderCategoryPill(category) {
  console.count("render called");
  console.log(category.name, category.color);
  const pill = modal.querySelector(".modal-category-pill");

  const color = category?.color || "#6b7280";
  const name = category?.name || "General";

  pill.textContent = name;
  pill.style.background = color + "20";
  pill.style.color = color;
  pill.style.border = `1px solid ${color}40`;
}
function renderCategoryDropdown(container) {
  container.innerHTML = "";
  categoryCache.forEach((color, name) => {
    if (name === activeCategory.name) return;

    const option = document.createElement("div");
    option.className = "category-option";
    option.textContent = name;
    option.tabIndex = 0;

    // Click selects the category and commits
    option.addEventListener("click", () => {
      activeCategory = { name, color };
      console.log("option input");

      commitCategoryEdit(activeCategory);
    });

    container.appendChild(option);
  });
}
function commitCategoryEdit(load) {
  const editor = modal.querySelector(".category-editor");
  const pill = modal.querySelector(".modal-category-pill");
  const nameInput = modal.querySelector(".category-input");
  const colorInput = modal.querySelector(".category-color");

  // Only commit if editor is visible
  if (!editor.classList.contains("hidden")) {
    activeCategory = load;
    console.log("commitCategory");
    console.log(activeCategory, "active category");
    renderCategoryPill(activeCategory);

    editor.classList.add("hidden");
    pill.classList.remove("hidden");

    console.count("commit called");
    console.log("Committed category:", activeCategory);
  }
}
