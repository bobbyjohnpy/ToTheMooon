import { onAuthReady } from "./auth.js";

export function initAuthGate(onAuthed) {
  let fired = false;

  onAuthReady((user) => {
    if (!user || fired) return;

    fired = true;
    onAuthed(user.uid);
  });
}
