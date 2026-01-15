# Copilot Instructions: Founder OS

## Project Overview
**Founder OS** ("To The Moon") is a professional PWA-based productivity system for founders. It provides multi-project task management, note-taking, real-time progress logging, and analytics with Firebase Firestore backend and offline-first architecture via Service Workers.

**Tech Stack (Fixed):**
- Frontend: HTML, CSS, vanilla JS (no frameworks)
- Backend: Firebase Firestore (hierarchical `users/{uid}/projects/{projectId}/...`)
- Auth: Anonymous by default → optional email/password upgrade
- Hosting: GitHub Pages under `/ToTheMooon/`
- PWA: Service Worker with versioned cache (GET only)

## Architecture

### Architecture Components
- **Project Context**: Global state (`currentProject`, `activeProjectId`) accessible on every page
- **Project Switcher**: Dropdown/picker in navigation bar to switch active project
- **Page Scoping**: All feature pages (Tasks, Notes, Progress, Dashboard) filtered by `activeProjectId`
- **Local Persistence**: Store `activeProjectId` in localStorage for session continuity
- **"All Projects" Analytics**: Dashboard aggregates across all projects when selected

### User Flow
1. Anonymous sign-in on first visit (`initAuth` auto-triggers)
2. User can optionally upgrade to named account (`upgradeAnonymousAccount`)
3. Data gated per-user with `uid`-based Firestore paths
4. Real-time listeners (`onSnapshot`) keep UI synchronized across tabs

### Data Model Hierarchy
```
firestore/
  users/{uid}/
    projects/{projectId} → { name, status, createdAt, notes[] }
      tasks/{taskId} → { title, status, subtasks[], notes[], assignedAt }
      progressEvents/{eventId} → { type, value, category, notes, timestamp }
        (type: "client", "revenue", "loss", "milestone")
    settings/preferences → { defaultProject, ... }
```

**Key Design:**
- **Flat Project System**: No sub-projects or hierarchies; each project is a top-level container
- **Projects as Context**: All pages are scoped by active project (except "All Projects" overview)
- **"All Projects" View**: Pseudo-view showing aggregated dashboard across all projects (not a Firestore doc)
- **Status Lanes**: Tasks display in lanes (To Do, In Progress, Done, etc.) not just a list
- **ProgressEvents**: Append-only event log for revenue, clients, losses, milestones (no updates, only adds)

## Key Patterns & Conventions

### Auth & State Management
- `auth.js` exports `initAuth(callback)`, `getUID()`, `getUser()`
- All Firestore queries must use `uid` from `getUID()` (set after auth ready)
- Pages use `initAuthGate(loadFn)` to wait for auth, then attach Firestore listener

### Firestore Patterns
- **Array Updates**: Use `arrayUnion({ ...data })` for notes/subtasks (immutable append)
- **Batch Reads**: Use `getDoc()` when modifying array elements (must fetch → modify → write whole array)
- **Listeners**: Return `unsubscribe` function for cleanup in `initAuthGate`
- **Timestamps**: Always use `Date.now()` for consistency

### UI Rendering
- **Tasks**: Render in **status lane columns** (To Do, In Progress, Done, etc.) not flat list
- **Task Cards**: `renderTask(uid, projectId, id, task)` creates interactive DOM card with status lane positioning
- **Dynamic Styling**: Use `task-card ${status}` class for status-based styling (urgency is secondary)
- **Event Binding**: Attach listeners **within** render function (not global), capture `uid`/`projectId`/`taskId` in closures
- **Enter-key Handling**: Standard pattern for textarea/input: `if (e.key === 'Enter')` then submit
- **Project Selector**: Present as dropdown in nav bar; changing updates `activeProjectId` and re-renders all pages

### Offline Support
- Service Worker (`sw.js`): Network-first strategy, fallback to cache for HTML/assets
- Cache name versioned: `founder-os-v{N}` (increment on asset changes)
- Firestore SDK handles offline queueing automatically

## Common Tasks

### Adding a New Feature
1. Create data functions in new module (e.g., `js/metrics.js`) with Firestore CRUD patterns
2. Create HTML page (e.g., `metrics.html`) with main element
3. Inject nav in page setup: `import { injectNav } from './nav.js'; injectNav('metrics')`
4. Gate data loading: `import { initAuthGate } from './auth-gate.js'; initAuthGate(loadMetrics)`
5. Update `nav.js` with new link

### Integrating Projects into Existing Code
1. **Migrate Firestore paths**: Change from `users/{uid}/{collection}` to `users/{uid}/projects/{projectId}/{collection}`
2. **Add project context**: Create `js/project-context.js` to manage `activeProjectId` (localStorage + global state)
3. **Update all queries**: Pass `projectId` to all data functions; filter by `activeProjectId`
4. **Add project switcher**: Inject dropdown in `nav.js` that updates `activeProjectId` and triggers page re-renders
5. **Create project creation flow**: Modal/form on Dashboard to create new projects with auto-generated projectId
6. **Update Dashboard**: Query all projects from `users/{uid}/projects` for "All Projects" analytics

### Modifying Task/Note/Subtask Logic
- Edit data functions in `js/tasks.js` (Firestore queries)
- Edit UI rendering in `renderTask()` (DOM generation + event listeners)
- Keep `uid` and `projectId` passed through function signatures for context

### Implementing Status Lanes
- Replace flat task list with grid/flex layout (columns per status: "To Do", "In Progress", "Done", etc.)
- Task creation picks a default status or starts in "To Do"
- Status change is a Firestore update: `await updateDoc(..., { status: newStatus })`
- Drag-and-drop optional (vanilla JS approach: click-to-move or status dropdown on card)

### Debugging
- Check `currentUID` is non-null in browser console after auth
- Firestore listener fires on page load; watch Network tab for `/tasks` queries
- Service Worker cache: DevTools → Application → Cache Storage → check `founder-os-v{N}`

## Dependencies
- **Firebase SDK v10.7.1** (CDN imports, no npm)
- **No build step** (ES modules via HTML script tags)
- **Icons**: 192x192 and 512x512 PNG in `icons/`

## Anti-Patterns to Avoid
- ❌ Direct DOM queries for user ID (always use `getUID()`)
- ❌ Modifying arrays directly in Firestore (use `arrayUnion` or fetch-modify-write)
- ❌ Global event listeners outside `renderTask()` (causes duplicates on re-render)
- ❌ Storing user state outside `auth.js` (breaks multi-tab sync)
