/*
 * A test "bot" that plays Disaster Ready by pressing the same virtual
 * controls a player would (DR.Input.bot) and finding paths around walls.
 * It is injected into the page by tests/playtest.js — it is not part of the game.
 */
window.Bot = (function () {
  const STEP = 1 / 60;
  const CELL = 8;

  function tick(n = 1) {
    for (let i = 0; i < n; i++) DR.Game.tick(STEP);
  }

  const scene = () => DR.Game.scene;
  const world = () => DR.Game.scene.world;
  const player = () => DR.Game.scene.world.player;
  const playing = () => DR.Game.state === 'play';

  /** Breadth-first search on a grid of 8px cells. avoid(x, y) marks extra no-go areas. */
  function findPath(to, avoid) {
    const w = world();
    const p = player();
    const cols = Math.ceil(w.w / CELL);
    const rows = Math.ceil(w.h / CELL);
    const cx = (x) => Math.max(0, Math.min(cols - 1, Math.floor(x / CELL)));
    const cy = (y) => Math.max(0, Math.min(rows - 1, Math.floor(y / CELL)));
    const center = (c) => c * CELL + CELL / 2;
    const start = cy(p.y) * cols + cx(p.x);
    const goalX = cx(to.x);
    const goalY = cy(to.y);
    const free = new Uint8Array(cols * rows); // 0 = unknown, 1 = free, 2 = blocked
    const isFree = (i) => {
      if (!free[i]) {
        const x = center(i % cols);
        const y = center(Math.floor(i / cols));
        const blocked = w.blocked(p.boxAt(x, y)) || (avoid && avoid(x, y) && Math.hypot(x - to.x, y - to.y) > 40);
        free[i] = blocked ? 2 : 1;
      }
      return free[i] === 1;
    };
    const prev = new Int32Array(cols * rows).fill(-1);
    prev[start] = start;
    const queue = [start];
    let best = start;
    let bestD = Infinity;
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      const x = i % cols;
      const y = Math.floor(i / cols);
      const d = Math.hypot(x - goalX, y - goalY);
      if (d < bestD) {
        bestD = d;
        best = i;
        if (d === 0) break;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx;
        if (prev[n] !== -1 || !isFree(n)) continue;
        prev[n] = i;
        queue.push(n);
      }
    }
    const pts = [];
    for (let i = best; i !== start; i = prev[i]) pts.push({ x: center(i % cols), y: center(Math.floor(i / cols)) });
    pts.reverse();
    // keep every few points so steering is smooth
    return pts.filter((_, i) => i % 3 === 2 || i === pts.length - 1);
  }

  /**
   * Walks to a point. Options: tol (how close), avoid(x, y), maxT (seconds), until() (stop early), run.
   * Returns true when reached (or until() became true).
   */
  function goTo(to, o = {}) {
    const tol = o.tol || 14;
    const maxT = o.maxT || 40;
    let path = findPath(to, o.avoid);
    let t = 0;
    let lastPos = { x: player().x, y: player().y };
    let stuckT = 0;
    while (t < maxT && playing()) {
      const p = player();
      if (o.until && o.until()) break;
      if (Math.hypot(p.x - to.x, p.y - to.y) < tol) break;
      while (path.length && Math.hypot(path[0].x - p.x, path[0].y - p.y) < 5) path.shift();
      const next = path[0] || to;
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      DR.Input.bot = { x: dx / len, y: dy / len, run: !!o.run };
      tick();
      t += STEP;
      // re-plan if we have not moved for a while (pushed by water, blocked…)
      if (Math.hypot(p.x - lastPos.x, p.y - lastPos.y) < 0.3) stuckT += STEP; else stuckT = 0;
      lastPos = { x: p.x, y: p.y };
      if (stuckT > 0.5 || (Math.round(t * 60) % 60 === 0)) {
        path = findPath(to, o.avoid);
        stuckT = 0;
      }
    }
    DR.Input.bot = { x: 0, y: 0 };
    const p = player();
    return !playing() || (o.until && o.until()) || Math.hypot(p.x - to.x, p.y - to.y) < tol;
  }

  function act() {
    DR.Input.pressAction();
    tick(2);
  }

  /** Waits (doing nothing) until cond() is true or time runs out. */
  function waitUntil(cond, maxT = 60) {
    DR.Input.bot = { x: 0, y: 0 };
    for (let t = 0; t < maxT; t += STEP) {
      if (cond()) return true;
      tick();
    }
    return cond();
  }

  function check(ok, msg) {
    if (!ok) throw new Error('Bot failed: ' + msg + ` (t=${scene() && scene().t.toFixed(1)}, health=${DR.Game.health.toFixed(0)}, state=${DR.Game.state})`);
  }

  /** Use the interactable whose label matches. */
  function useLabel(re, o = {}) {
    const it = world().interactables.find((i) => re.test(i.label) && i.enabled());
    check(it, 'no interactable ' + re);
    check(goTo({ x: it.x, y: it.y + (o.dy || 0) }, { tol: o.tol || 24, avoid: o.avoid }), 'could not reach ' + it.label);
    act();
    return it;
  }

  // ---------- Prepare phase: collect every useful item ----------
  function playPrepare(o = {}) {
    DR.Input.bot = { x: 0, y: 0 };
    tick(10);
    const takeBad = o.takeBad || 0;
    let bad = 0;
    for (let guard = 0; guard < 20 && playing() && DR.Game.phase === 'prepare'; guard++) {
      const p = player();
      const items = world().interactables.filter((i) => i.itemId && (DR.ITEMS[i.itemId].good || bad < takeBad));
      if (!items.length) break;
      items.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      const it = items[0];
      check(goTo({ x: it.x, y: it.y }, { tol: 20, run: true }), 'reach item ' + it.itemId);
      act();
      if (!DR.ITEMS[it.itemId].good) bad++;
    }
    return { kit: DR.Game.kit.slice(), score: DR.Game.score, state: DR.Game.state };
  }

  // ---------- Disaster phases ----------
  const LEVELS = {
    earthquake() {
      const s = scene();
      check(waitUntil(() => s.state === 'shaking', 10), 'shaking never started');
      const p = player();
      const desks = s.desks.filter((d) => !d.nearWindow && !d.occupied);
      desks.sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y));
      const d = desks[0];
      const avoid = (x, y) => world().inZone('lights', x, y) || world().inZone('shelves', x, y) || world().inZone('windows', x, y);
      check(goTo({ x: d.cx, y: d.y + d.h + 10 }, { tol: 12, avoid }), 'reach desk');
      act();
      check(s.covered === d, 'did not take cover');
      check(waitUntil(() => s.state === 'evacuate', 20), 'shaking never stopped');
      check(goTo({ x: 568, y: 315 }, { tol: 16, avoid: (x, y) => world().inZone('lights', x, y) }), 'reach classroom door');
      check(goTo({ x: 650, y: 590 }, { tol: 16 }), 'reach exit');
      check(goTo({ x: 540, y: 880 }, { tol: 16, until: () => s.state === 'aftershock' }), 'walk to assembly');
      check(s.state === 'aftershock', 'no aftershock');
      // make sure we are away from danger, then drop
      if (world().inZone('nearBuilding', player().x, player().y) || world().inZone('nearTree', player().x, player().y)) goTo({ x: 540, y: 880 }, { tol: 16 });
      act();
      check(s.dropped, 'did not drop for aftershock');
      check(waitUntil(() => s.state === 'evacuate2', 10), 'aftershock never ended');
      goTo({ x: 540, y: 860 }, { tol: 10 });
      check(waitUntil(() => !playing(), 10), 'level did not complete');
    },

    flood() {
      const s = scene();
      const wire = (x, y) => Math.hypot(x - 960, y - 520) < 140;
      useLabel(/main power/);
      check(s.switched, 'power not switched off');
      useLabel(/Little Kai/, { avoid: wire });
      useLabel(/Grandma Amara/, { avoid: wire });
      check(s.neighbours.every((n) => n.helped), 'neighbours not helped');
      check(goTo({ x: 1600, y: 540 }, { tol: 30, avoid: wire, until: () => s.safe }), 'reach high ground');
      check(waitUntil(() => !playing(), 10), 'level did not complete');
    },

    heatwave() {
      const s = scene();
      useLabel(/dizzy shopper/);
      check(s.quest === 'escort', 'not escorting');
      check(goTo({ x: 1240, y: 700 }, { tol: 20, until: () => s.quest === 'call' }), 'reach shade');
      check(waitUntil(() => s.quest === 'call', 5), 'shopper not in shade');
      useLabel(/Call emergency/);
      check(s.quest === 'cloth', 'did not call');
      const p = player();
      const tap = s.taps.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      check(goTo({ x: tap.x, y: tap.y + 22 }, { tol: 14 }), 'reach tap');
      act();
      check(s.hasCloth, 'cloth not wet');
      // cool down in the shade on the way back
      useLabel(/wet cloth/);
      check(s.quest === 'wait', 'did not cool');
      check(waitUntil(() => !playing(), 20), 'level did not complete');
    },

    storm() {
      const s = scene();
      for (let guard = 0; guard < 10; guard++) {
        const p = player();
        const jobs = world().interactables.filter((i) => /Secure|shutters/.test(i.label) && i.enabled());
        if (!jobs.length) break;
        jobs.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        check(goTo({ x: jobs[0].x, y: jobs[0].y }, { tol: 24 }), 'reach ' + jobs[0].label);
        act();
      }
      check(s.allDone(), 'not everything secured');
      useLabel(/Take shelter/);
      check(s.sheltered, 'not sheltered');
      check(waitUntil(() => s.state === 'storm', 10), 'storm never came');
      check(waitUntil(() => s.state === 'after', 40), 'storm never ended');
      check(s.sheltered, 'left shelter');
      act(); // listen to the radio (works while sheltering)
      check(s.state === 'evacuate', 'did not listen to radio');
      const avoid = (x, y) => world().inZone('flood', x, y) || Math.hypot(x - 1000, y - 470) < 120;
      check(goTo({ x: 1380, y: 530 }, { tol: 20, avoid, until: () => s.state === 'arrived' }), 'reach cyclone shelter');
      check(waitUntil(() => !playing(), 10), 'level did not complete');
    }
  };

  function playDisaster(id) {
    DR.Input.bot = { x: 0, y: 0 };
    LEVELS[id]();
    DR.Input.bot = null;
    return { score: DR.Game.score, health: Math.round(DR.Game.health), state: DR.Game.state };
  }

  return { tick, goTo, act, waitUntil, playPrepare, playDisaster, findPath };
})();
