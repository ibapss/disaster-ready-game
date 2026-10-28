/*
 * Saves small bits of progress (high score, unlocked levels, sound setting)
 * in the browser's localStorage. If storage is blocked (private mode),
 * the game still works — it just won't remember anything.
 */
DR.Store = {
  prefix: 'disasterReady.',

  get(key, fallback) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable: ignore */
    }
  }
};
