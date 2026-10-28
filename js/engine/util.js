/*
 * Small maths and helper functions used everywhere.
 */
DR.U = {
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  rand: (min, max) => min + Math.random() * (max - min),
  pick: (list) => list[Math.floor(Math.random() * list.length)],

  /** Returns a shuffled copy of a list. */
  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /** Do two rectangles {x, y, w, h} overlap? */
  overlap: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,

  /**
   * Is a point inside a shape? A shape is either a rectangle {x, y, w, h}
   * or a circle {cx, cy, r}.
   */
  inShape(px, py, s) {
    if (s.r !== undefined) return Math.hypot(px - s.cx, py - s.cy) <= s.r;
    return px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h;
  },

  /** Turns seconds into "m:ss". */
  formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  },

  /** A random number generator that gives the same numbers every time (for scenery). */
  seeded(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },

  /** Escapes text before putting it into HTML. */
  esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};
