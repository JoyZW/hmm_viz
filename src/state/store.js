// Tiny pub/sub store.

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    /** Shallow-merge a patch (object or function of state) and notify subscribers with (next, prev). */
    set(patch) {
      const prev = state;
      const p = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...p };
      subs.forEach((fn) => fn(state, prev));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
