/*
 * A World holds everything in one level: props, collision boxes, zones,
 * things you can interact with, people, the camera and little effects.
 *
 * Main ideas:
 *  - solids:        boxes you cannot walk through
 *  - zones:         named areas used by level rules ("windows", "shade", "safe"…)
 *  - interactables: things you can use with the Action button
 */
DR.World = class World {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.solids = [];
    this.props = [];
    this.zones = {};
    this.interactables = [];
    this.characters = [];
    this.followers = [];
    this.trail = [];          // where the player has walked (for followers)
    this.player = null;
    this.cam = { x: 0, y: 0 };
    this.camSnap = true;
    this.shake = 0;           // screen shake strength in pixels
    this.floaters = [];       // floating "+50" texts
    this.particles = [];
    this.marker = null;       // {x, y} — bouncing arrow showing where to go
    this.focus = null;        // the interactable the player is next to
    this.ground = null;       // function(ctx, t) that paints the floor
    this.afterFloor = null;   // function(ctx, t) drawn after the floor (water, shade…)
    this.bg = '#9ad46f';      // colour outside the map
  }

  // ---------- Building the level ----------
  addSolid(x, y, w, h, extra) {
    const s = Object.assign({ x, y, w, h, enabled: true }, extra || {});
    this.solids.push(s);
    return s;
  }

  /** Adds a prop (see js/gfx/props.js) and its collision boxes. */
  add(prop) {
    this.props.push(prop);
    if (prop.hits) prop.solidRects = prop.hits.map((r) => this.addSolid(r.x, r.y, r.w, r.h));
    else if (prop.solid) prop.solidRects = [this.addSolid(prop.x, prop.y, prop.w, prop.h)];
    else prop.solidRects = [];
    return prop;
  }

  remove(prop) {
    this.props = this.props.filter((p) => p !== prop);
    (prop.solidRects || []).forEach((s) => { s.enabled = false; });
  }

  /** Adds one or more shapes to a named zone. Shapes: {x,y,w,h} or {cx,cy,r}. */
  zone(name, ...shapes) {
    (this.zones[name] = this.zones[name] || []).push(...shapes);
  }

  inZone(name, x, y) {
    const z = this.zones[name];
    return !!z && z.some((s) => DR.U.inShape(x, y, s));
  }

  /**
   * Something the player can use with the Action button.
   * o = { x, y, r, label, use(), enabled(), follow (optional character to stick to) }
   */
  interact(o) {
    // defaults are added to the object itself so "get label()" getters keep working
    if (o.r === undefined) o.r = DR.CONFIG.INTERACT_RADIUS;
    if (!o.enabled) o.enabled = () => true;
    this.interactables.push(o);
    return o;
  }

  removeInteract(it) {
    this.interactables = this.interactables.filter((i) => i !== it);
  }

  addCharacter(ch) {
    this.characters.push(ch);
    return ch;
  }

  setPlayer(ch) {
    this.player = ch;
    this.addCharacter(ch);
    this.trail = [{ x: ch.x, y: ch.y }];
  }

  // ---------- Movement and collisions ----------
  blocked(box) {
    if (box.x < 0 || box.y < 0 || box.x + box.w > this.w || box.y + box.h > this.h) return true;
    for (const s of this.solids) if (s.enabled && DR.U.overlap(box, s)) return true;
    return false;
  }

  /**
   * Moves a character, sliding along walls. Small "corner help" nudges the
   * player around corners so door gaps are easy to walk through.
   */
  move(ch, dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3));
    const sx = dx / steps;
    const sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (sx) {
        if (!this.blocked(ch.boxAt(ch.x + sx, ch.y))) ch.x += sx;
        else if (Math.abs(sy) < Math.abs(sx) * 0.5) this.nudge(ch, sx, 0);
      }
      if (sy) {
        if (!this.blocked(ch.boxAt(ch.x, ch.y + sy))) ch.y += sy;
        else if (Math.abs(sx) < Math.abs(sy) * 0.5) this.nudge(ch, 0, sy);
      }
    }
  }

  nudge(ch, sx, sy) {
    for (let off = 1; off <= 10; off++) {
      for (const sign of [1, -1]) {
        const ox = sy ? off * sign : 0;
        const oy = sx ? off * sign : 0;
        if (!this.blocked(ch.boxAt(ch.x + ox + sx, ch.y + oy + sy))) {
          const step = Math.abs(sx || sy) * 0.8;
          if (!this.blocked(ch.boxAt(ch.x + Math.sign(ox) * step, ch.y + Math.sign(oy) * step))) {
            ch.x += Math.sign(ox) * step;
            ch.y += Math.sign(oy) * step;
          }
          return;
        }
      }
    }
  }

  /**
   * Moves the player using the controls.
   * o = { speedMult, pushX, pushY, wobble }
   */
  updatePlayer(dt, o = {}) {
    const p = this.player;
    const mv = DR.Input.getMove();
    const mag = Math.hypot(mv.x, mv.y);
    p.running = false;
    p.moving = false;
    if (!p.locked) {
      const run = DR.Input.isRunning() && mag > 0.1;
      const speed = DR.CONFIG.PLAYER_SPEED * (run ? DR.CONFIG.RUN_MULTIPLIER : 1) * (o.speedMult === undefined ? 1 : o.speedMult);
      let vx = mv.x * speed + (o.pushX || 0);
      let vy = mv.y * speed + (o.pushY || 0);
      if (o.wobble) {
        vx += Math.sin(performance.now() / 70) * o.wobble;
        vy += Math.cos(performance.now() / 90) * o.wobble;
      }
      this.move(p, vx * dt, vy * dt);
      if (mag > 0.1) {
        p.moving = true;
        p.running = run;
        p.face(mv.x, mv.y);
        p.walkT += dt * (run ? 15 : 10);
      }
    }

    // remember the path for followers
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 3) {
      this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 400) this.trail.shift();
    }
    this.followers.forEach((f, i) => {
      const idx = Math.max(0, this.trail.length - 1 - 9 * (i + 1));
      const target = this.trail[idx];
      const far = Math.hypot(target.x - f.x, target.y - f.y);
      f.walkTo(target, dt, Math.max(60, far * 4));
    });

    this.updateFocus();
  }

  /** Finds the closest thing the player can use right now. */
  updateFocus() {
    const p = this.player;
    this.focus = null;
    let best = Infinity;
    for (const it of this.interactables) {
      if (it.follow) {
        // interactable attached to a moving character
        it.x = it.follow.x;
        it.y = it.follow.y;
      }
      if (!it.enabled()) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < it.r && d < best) {
        best = d;
        this.focus = it;
      }
    }
  }

  updateCamera(dt) {
    const vw = DR.CONFIG.WIDTH;
    const vh = DR.CONFIG.HEIGHT;
    const p = this.player;
    let tx = p.x - vw / 2;
    let ty = p.y - 20 - vh / 2;
    tx = this.w <= vw ? (this.w - vw) / 2 : DR.U.clamp(tx, 0, this.w - vw);
    ty = this.h + 60 <= vh ? (this.h - vh) / 2 - 30 : DR.U.clamp(ty, -60, this.h - vh);
    if (this.camSnap) {
      this.cam.x = tx;
      this.cam.y = ty;
      this.camSnap = false;
    } else {
      const k = 1 - Math.exp(-dt * 8);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    }
  }

  // ---------- Little effects ----------
  /** Floating text such as "+50". */
  float(text, x, y, color) {
    this.floaters.push({ text, x, y, color: color || '#2a9d8f', life: 1.3 });
  }

  /** p = { x, y, vx, vy, life, size, color, gravity, shape } */
  emit(p) {
    p.max = p.life;
    this.particles.push(p);
  }

  updateEffects(dt) {
    this.floaters.forEach((f) => { f.life -= dt; f.y -= 32 * dt; });
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.particles.forEach((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- Drawing ----------
  /** Draws the map, props and people (in world coordinates). */
  draw(ctx, t) {
    const sx = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    const sy = this.shake ? (Math.random() * 2 - 1) * this.shake : 0;
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, DR.CONFIG.WIDTH, DR.CONFIG.HEIGHT);
    ctx.save();
    ctx.translate(Math.round(-this.cam.x + sx), Math.round(-this.cam.y + sy));

    if (this.ground) this.ground(ctx, t);
    for (const p of this.props) if (p.layer === 'floor') p.draw(ctx, t, this);
    if (this.afterFloor) this.afterFloor(ctx, t);

    // walls: dark outline pass first, then the light top, so joins look clean
    const walls = this.props.filter((p) => p.wall);
    ctx.fillStyle = DR.G.OUTLINE;
    for (const w of walls) ctx.fillRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);
    for (const w of walls) {
      ctx.fillStyle = w.color;
      ctx.fillRect(w.x + 1.5, w.y + 1.5, w.w - 3, w.h - 3);
    }

    for (const p of this.props) if (p.layer === 'low' && !p.wall) p.draw.call(p, ctx, t, this);
    this.characters.slice().sort((a, b) => a.y - b.y).forEach((c) => c.draw(ctx, t));
    for (const p of this.props) {
      if (p.layer === 'high') p.draw.call(p, ctx, t, this);
      else if (p.drawHigh) p.drawHigh(ctx, t, this);
    }

    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 2);
      if (p.shape === 'line') {
        DR.G.line(ctx, p.x, p.y, p.x + p.vx * 0.03, p.y + p.vy * 0.03, p.color, p.size);
      } else if (p.shape === 'leaf') {
        DR.G.ellipse(ctx, p.x, p.y, p.size, p.size * 0.55, p.color);
      } else {
        DR.G.circle(ctx, p.x, p.y, p.size, p.color);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Draws things that should never be hidden: prompts, markers, floating text. */
  drawUI(ctx, t) {
    ctx.save();
    ctx.translate(Math.round(-this.cam.x), Math.round(-this.cam.y));
    const G = DR.G;

    // where-to-go marker
    if (this.marker) {
      const m = this.marker;
      const bob = Math.sin(t * 5) * 5;
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = G.OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 30 + bob);
      ctx.lineTo(m.x - 11, m.y - 46 + bob);
      ctx.lineTo(m.x - 4, m.y - 46 + bob);
      ctx.lineTo(m.x - 4, m.y - 60 + bob);
      ctx.lineTo(m.x + 4, m.y - 60 + bob);
      ctx.lineTo(m.x + 4, m.y - 46 + bob);
      ctx.lineTo(m.x + 11, m.y - 46 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      G.label(ctx, f.text, f.x, f.y, { size: 18, color: f.color });
    }
    ctx.globalAlpha = 1;

    // action prompt bubble
    if (this.focus && (!this.player.locked || this.focus.whileLocked)) {
      const it = this.focus;
      const key = DR.Input.touchMode ? 'ACT' : 'SPACE';
      ctx.font = `800 13px ${G.FONT}`;
      const tw = ctx.measureText(it.label).width;
      ctx.font = `900 11px ${G.FONT}`;
      const kw = ctx.measureText(key).width + 10;
      const w = tw + kw + 22;
      const bx = it.x - w / 2;
      const by = it.y - (it.promptY || 58) + Math.sin(t * 4) * 2;
      G.box(ctx, bx, by, w, 26, { fill: '#ffffff', r: 13 });
      G.box(ctx, bx + 5, by + 5, kw, 16, { fill: '#3d3a4b', r: 5, stroke: false });
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key, bx + 5 + kw / 2, by + 13.5);
      ctx.font = `800 13px ${G.FONT}`;
      ctx.fillStyle = G.OUTLINE;
      ctx.textAlign = 'left';
      ctx.fillText(it.label, bx + kw + 12, by + 13.5);
    }
    ctx.restore();

    // arrow at the screen edge if the marker is off-screen
    if (this.marker) {
      const mx = this.marker.x - this.cam.x;
      const my = this.marker.y - 30 - this.cam.y;
      const W = DR.CONFIG.WIDTH;
      const H = DR.CONFIG.HEIGHT;
      if (mx < 20 || mx > W - 20 || my < 70 || my > H - 20) {
        const cx = W / 2;
        const cy = H / 2;
        const a = Math.atan2(my - cy, mx - cx);
        const ex = DR.U.clamp(mx, 40, W - 40);
        const ey = DR.U.clamp(my, 100, H - 40);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = G.OUTLINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-6, -16);
        ctx.lineTo(-6, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
};
