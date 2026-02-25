import {
  onNotesChange,
  createNote,
  updateNote,
  deleteNote,
  subscribeNotes,
} from "./notes-service.js";
let modalVisible = false;
let modalReadyForSave = false;
let notesGrid;
let modal, titleInput, contentInput, categoryInput, saveBtn, deleteBtn;
let activeNoteId = null;
let optionClicked = false;
let enterCommitted = false;
let activeCategory = { name: "General", color: "#6b7280" };
let originalNote, newNote;
let taskToDeleteId = null;
let modalDeleteButtonClicked = false;
let tempNewId = false;
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
}

// ───────── RENDER ─────────
function renderNotes(notes) {
  notesGrid.innerHTML = "";
  categoryCache.clear();
  console.count("renderNotes fired");

  notes.forEach((note) => {
    // Cache categories
    if (note.category?.name) {
      categoryCache.set(note.category.name, note.category.color || "#6b7280");
    }

    const card = document.createElement("div");
    card.className = "note-card";
    card.dataset.noteId = note.id;
    card.innerHTML = `
     <span 
  class="tag"
  style="background:${note.category?.color || "#6b7280"}20;
         color:${note.category?.color || "#6b7280"};
         border:1px solid ${note.category?.color || "#6b7280"}40">
  ${note.category?.name.toUpperCase() || "GENERAL"}
</span>
      <h3>${note.title}</h3>
      <div>
      <p>${note.content}</p>
      </div>
      <div class="note-footer">
        ${formatDate(note.updatedAt)}
        <button class = "delete-note-btn">
              <span class = "material-symbols-outlined delete-span">delete</span>Delete
              </button>
      </div>

    `;
    const deleteBtn = card.querySelector(".delete-note-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // prevent modal from opening
      openDeleteTaskModal(note.id);
    });

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
  add.innerHTML = `<div class="plus"><span class = "material-symbols-outlined">post_add</span><p class="add-note-card-text">Add Note</p></div>`;
  add.onclick = () => {
    tempNewId = true;
    openModal({ id: null, title: "", content: "", category: "General" });
  };
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
  <button class = "delete-note-btn">
  <span class = "material-symbols-outlined delete-span">delete</span>
  delete note </button>
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

  const autoSaveCheckbox = modal.querySelector(".autosave-checkbox");
  const autoSaveLabel = modal.querySelector(".autosave");
  let autoSaveEnabled = autoSaveCheckbox.checked;
  const modalDeleteBtn = modal.querySelector(".modal-header .delete-note-btn");
  autoSaveCheckbox.addEventListener("change", () => {
    autoSaveEnabled = autoSaveCheckbox.checked;
    autoSaveLabel.textContent = autoSaveEnabled
      ? "Auto-save ON"
      : "Auto-save OFF";
  });

  modalDeleteBtn.addEventListener("click", async () => {
    modalDeleteButtonClicked = true;
    console.log("new delete clicked", activeNoteId);
    openDeleteTaskModal(activeNoteId);
  });

  modal.addEventListener("mousedown", async (e) => {
    // Only save + close the modal if clicking outside content
    if (e.target === e.currentTarget) {
      if (autoSaveEnabled && modalReadyForSave && !tempNewId) {
        newNote = {
          titleInput: titleInput.value,
          contentInput: contentInput.value,
          name: activeCategory.name,
          color: activeCategory.color,
        };
        console.log("original category", originalNote, "new note", newNote);
        if (shallowEqual(originalNote, newNote)) {
          modalReadyForSave = false;
          closeModal();
          return;
        }
        await saveNote();
      }

      await closeModal();
      modalReadyForSave = false;
    }
  });
  closeBtn.addEventListener("mousedown", async (e) => {
    // Only save + close the modal if clicking outside content
    if (e.target === e.currentTarget) {
      if (autoSaveEnabled && modalReadyForSave) {
        newNote = {
          titleInput: titleInput.value,
          contentInput: contentInput.value,
          name: activeCategory.name,
          color: activeCategory.color,
        };
        if (shallowEqual(originalNote, newNote)) {
          modalReadyForSave = false;
          closeModal();
          return;
        }
        await saveNote();
      }
      await closeModal();
      modalReadyForSave = false;
    }
  });
  // Commit category edits anytime user clicks in modal
  editor.addEventListener("focusout", (e) => {
    // If the new focused element is still inside the editor, do nothing
    if (editor.contains(e.relatedTarget)) return;
    if (optionClicked) {
      optionClicked = false;
      return;
    }
    // Otherwise, focus left the editor completely → commit
    const name = modal.querySelector(".category-input").value;
    const color = modal.querySelector(".category-color").value;
    activeCategory = { name, color };
    commitCategoryEdit(activeCategory);
  });

  // 🟣 PILL CLICK → EDIT CATEGORY
  pill.addEventListener("click", () => {
    pill.classList.add("hidden");
    editor.classList.remove("hidden");

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

  // STOP propagation so outside click does not trigger auto-save immediately
  editor.addEventListener("mousedown", (e) => e.stopPropagation());
  dropdown.addEventListener("mousedown", (e) => e.stopPropagation());

  saveBtn.addEventListener("click", async () => {
    newNote = {
      titleInput: titleInput.value,
      contentInput: contentInput.value,
      name: activeCategory.name,
      color: activeCategory.color,
    };
    if (shallowEqual(originalNote, newNote)) {
      modalReadyForSave = false;
      closeModal();
      return;
    }
    await saveNote();
    closeModal();
    modalReadyForSave = false;
  });

  async function saveNote() {
    const payload = {
      title: titleInput.value,
      content: contentInput.value,
      category: activeCategory,
    };
    console.log("activeNoteId", activeNoteId);
    if (activeNoteId) {
      await updateNote(activeNoteId, payload);
    } else {
      tempNewId = false;
      const newNote = await createNote(payload);
      activeNoteId = newNote.id; // <-- only the string ID
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
  originalNote = {
    titleInput: note.title,
    contentInput: note.content,
    name: note.category.name,
    color: note.category.color,
  };
  console.log("originalNote", originalNote);

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
  modalVisible = true;
  modal.classList.remove("hidden");
  if (!note.id) {
    modalReadyForSave = true;
  }
}
async function closeModal() {
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

function renderCategoryPill(category) {
  console.count("render called");
  console.log(category.name, category.color);
  const pill = modal.querySelector(".modal-category-pill");

  const color = category?.color || "#6b7280";
  const name = (category?.name || "General").toUpperCase();

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

      optionClicked = true;
      commitCategoryEdit(activeCategory);
    });

    container.appendChild(option);
  });
}
function commitCategoryEdit(load) {
  const editor = modal.querySelector(".category-editor");
  const pill = modal.querySelector(".modal-category-pill");

  if (!editor.classList.contains("hidden")) {
    activeCategory = load;
    renderCategoryPill(activeCategory);
    editor.classList.add("hidden");
    pill.classList.remove("hidden");
  }
}
function getOriginCard() {
  const id = document.querySelector(".note-modal-content")?.dataset
    .originCardId;

  if (!id) return null;

  return [...document.querySelectorAll(".note-card")].find(
    (card) => card.dataset.noteId === id,
  );
}
function morphCardToTrash(card) {
  if (!card) return;

  card.classList.add("deleting");

  card.innerHTML = `
    <div class="trash-morph">
      <span class="material-symbols-outlined">delete</span>
    </div>
  `;
}
function shallowEqual(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((k) => a[k] === b[k]);
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
  modalContent.dataset.originCardId = note.id;
  setTimeout(() => {
    modalReadyForSave = true;
  }, 420);
}
function openDeleteTaskModal(taskId) {
  console.log("taskId", taskId);
  taskToDeleteId = taskId;
  document.getElementById("deleteTaskModal").classList.remove("hidden");
}

function closeDeleteTaskModal() {
  document.getElementById("deleteTaskModal").classList.add("hidden");
}
document
  .getElementById("confirmDeleteTaskBtn")
  ?.addEventListener("click", async () => {
    if (tempNewId) {
      closeDeleteTaskModal();
      modal.classList.add("hidden");
      return;
    }
    if (!taskToDeleteId) return;

    try {
      if (modalDeleteButtonClicked) {
        closeDeleteTaskModal();
        modal.classList.add("no-blur");
        const modalContent = document.querySelector(".note-modal-content");

        // Remove blur instantly
        document.querySelector(".notes-grid")?.classList.remove("modal-open");

        // Find origin card
        const originCard = getOriginCard();

        // Morph card into trash icon
        morphCardToTrash(originCard);

        // Read expansion data
        const data = modalContent.dataset.expandedFrom;
        if (!data) {
          await deleteNote(taskToDeleteId);
          modal.classList.add("hidden");
          return;
        }

        const { deltaX, deltaY } = JSON.parse(data);

        modalContent.style.transition =
          "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease";

        // Shrink INTO the trash icon
        modalContent.style.transform = `
    translate(-50%, -50%)
    translate(${deltaX}px, ${deltaY}px)
    scale(0.15)
  `;

        modalContent.style.opacity = "0";

        setTimeout(async () => {
          modal.classList.add("hidden");
          modalContent.style.transform = "";
          modalContent.style.opacity = "";
          modalContent.style.transition = "";
          modalContent.dataset.expandedFrom = "";
          modalContent.dataset.originCardId = "";

          await deleteNote(taskToDeleteId);
          activeNoteId = null;
          taskToDeleteId = null;
        }, 420);
        return;
      }
      await deleteNote(taskToDeleteId); // Firestore delete
      taskToDeleteId = null;
      // Firestore snapshot will remove the card
      closeDeleteTaskModal();
    } catch (err) {
      console.error("Failed to delete task", err);
    } finally {
    }
  });

document
  .getElementById("cancelDeleteTaskBtn")
  ?.addEventListener("click", () => {
    taskToDeleteId = null;
    closeDeleteTaskModal();
  });
// document.getElementById("deleteTaskModal")?.addEventListener("click", (e) => {
//   if (e.target.id === "deleteTaskModal") {
//     closeDeleteTaskModal();
//   }
// });
