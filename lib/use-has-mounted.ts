import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// Client-only "has hydrated" flag without an effect+setState (which risks
// the extra re-render pass ESLint's react-hooks/set-state-in-effect flags).
// useSyncExternalStore is the sanctioned way to read a value that's known
// only on the client without a hydration mismatch.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
