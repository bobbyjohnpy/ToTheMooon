import { initAuth } from "./auth.js";

export function initAuthGate(loadFn) {
  let unsubscribe = null;

  initAuth((user) => {
    // Detach old Firestore listener
    if (unsubscribe) unsubscribe();

    // Attach new one
    unsubscribe = loadFn(user.uid);
  });
}
