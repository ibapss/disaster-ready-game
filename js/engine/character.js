/*
 * A character: the player or any other person in a level.
 * (x, y) is the point between the feet.
 */
DR.Character = class Character {
  constructor(x, y, look, opts = {}) {
    this.x = x;
    this.y = y;
    this.look = typeof look === 'string' ? DR.People.LOOKS[look] : look;
    this.facing = opts.facing || 'down';
    this.walkT = 0;
    this.moving = false;
    this.running = false;
    this.pose = 'stand';      // 'stand' | 'cover' | 'drop' | 'sit'
    this.mood = null;         // null | 'worried' | 'dizzy'
    this.speed = opts.speed || 110;
    this.name = opts.name || '';
    this.locked = false;      // true = cannot walk (e.g. hiding under a desk)
    this.visible = true;
    this.path = null;         // list of {x, y} points to walk along
    this.bubble = null;       // small icon above the head: '!' or '?'
  }

  /** The small collision box around the feet. */
  boxAt(x, y) {
    return { x: x - 8, y: y - 6, w: 16, h: 9 };
  }

  face(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else if (dy !== 0) this.facing = dy < 0 ? 'up' : 'down';
  }

  /** Walks straight toward a point (no collisions). Returns true when there. */
  walkTo(pt, dt, speed) {
    const dx = pt.x - this.x;
    const dy = pt.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      this.moving = false;
      return true;
    }
    const step = Math.min(d, (speed || this.speed) * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.moving = true;
    this.walkT += dt * 10;
    this.face(dx, dy);
    return false;
  }

  /** Follows this.path one point at a time. Returns true when finished. */
  followPath(dt) {
    if (!this.path || !this.path.length) {
      this.moving = false;
      return true;
    }
    if (this.walkTo(this.path[0], dt)) this.path.shift();
    return false;
  }

  draw(ctx, t) {
    if (!this.visible) return;
    DR.People.draw(ctx, this, t);
    if (this.bubble) {
      const s = (this.look.scale || 1);
      const by = this.y - 62 * s + Math.sin(t * 4) * 2;
      DR.G.box(ctx, this.x - 11, by - 11, 22, 22, { fill: '#ffffff', r: 11 });
      DR.G.label(ctx, this.bubble, this.x, by + 1, { size: 15, color: '#e76f51', outline: '#fff', lw: 1 });
    }
  }
};
