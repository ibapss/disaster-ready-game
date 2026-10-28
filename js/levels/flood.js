/*
 * LEVEL 2 — FLOOD at home near the river.
 *
 *  1. Switch off the main electricity switch (the door stays shut until you do).
 *  2. Water rises slowly from the river across the low ground.
 *     Move to higher ground: the hill (east) or the roof of the community centre.
 *  3. Bonus: help your neighbours (an elderly lady and a child) come with you.
 *  Walking through floodwater or near the fallen power line hurts.
 *
 * Height of the land: every place has an "elevation". The water level
 * rises over time, and anywhere lower than the water level is flooded.
 */
(function () {
  const P = DR.P;
  const G = DR.G;

  // Land height along the map from west (river) to east (hill): [x, height]
  const PROFILE = [[0, -1], [230, -1], [300, 0.3], [900, 1.4], [1000, 1.6], [1350, 2.2], [1550, 4.5], [1800, 5]];
  const WATER_START = -0.6;   // starting water level
  const WATER_RATE = 0.032;   // how fast the water rises (height per second)
  const WATER_MAX = 2.75;     // the water stops rising here
  const ROOF = { x: 1074, y: 714, w: 212, h: 212 };
  const STAIRS = { x: 1240, y: 926, w: 46, h: 94 };
  const WIRE = { x: 960, y: 520 };

  function wobble(y) {
    return 0.12 * Math.sin(y / 110);
  }

  /** Land height at a given x (ignores small bumps). */
  function profileAt(x) {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [x1, h1] = PROFILE[i];
      const [x2, h2] = PROFILE[i + 1];
      if (x <= x2) return h1 + ((h2 - h1) * (x - x1)) / (x2 - x1);
    }
    return PROFILE[PROFILE.length - 1][1];
  }

  /** The x where the land is exactly `h` high. */
  function xForHeight(h) {
    if (h <= PROFILE[0][1]) return 0;
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [x1, h1] = PROFILE[i];
      const [x2, h2] = PROFILE[i + 1];
      if (h <= h2 && h2 > h1) return x1 + ((h - h1) * (x2 - x1)) / (h2 - h1);
    }
    return PROFILE[PROFILE.length - 1][0];
  }

  function elevAt(x, y) {
    if (DR.U.inShape(x, y, ROOF) || DR.U.inShape(x, y, STAIRS)) return 6;
    return profileAt(x) + wobble(y);
  }

  /** Where the water (or a height contour) reaches on row y. */
  function edgeX(level, y) {
    return xForHeight(level - wobble(y));
  }

  class FloodScene extends DR.Scene {
    constructor(game) {
      super(game);
      this.level = WATER_START;
      this.switched = false;
      this.safe = false;
      this.safeT = 0;
      this.build();
      game.radio('FLOOD WARNING for the river area. Water levels are rising. Switch off your main electricity and move to higher ground now. Check on neighbours who may need help.');
      game.tip('fl_warning', 'bad');
      DR.Audio.play('alarm');
    }

    build() {
      const w = (this.world = new DR.World(1800, 1100));
      const add = (p) => w.add(p);

      w.ground = (c) => {
        G.floor(c, 'grass', 0, 0, w.w, w.h);
        // the hill: lighter bands higher up, following the height contours
        [[2.6, '#a8dc7f'], [3.2, '#b5e48c'], [3.8, '#c3eb9a'], [4.4, '#d0f0a8']].forEach(([h, col]) => {
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(w.w, 0);
          for (let y = 0; y <= w.h; y += 25) c.lineTo(edgeX(h, y), y);
          c.lineTo(w.w, w.h);
          c.closePath();
          c.fill();
        });
        // river and its banks
        c.fillStyle = '#d6c08f'; c.fillRect(0, 0, 300, w.h);
        c.fillStyle = '#3a86c8'; c.fillRect(0, 0, 230, w.h);
        G.floor(c, 'road', 920, 0, 80, w.h);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.setLineDash([20, 18]);
        c.beginPath(); c.moveTo(960, 0); c.lineTo(960, w.h); c.stroke(); c.setLineDash([]);
        G.floor(c, 'paving', 630, 490, 290, 40);
        G.floor(c, 'wood', 330, 380, 300, 260);
        G.box(c, 650, 110, 230, 190, { fill: '#e9d8a6', r: 12, stroke: false });
      };

      // water is drawn over the ground but under houses and people
      w.afterFloor = (c, t) => this.drawWater(c, t);

      // ----- Your home (seen from above, roof removed) -----
      add(P.wall(330, 380, 300, 14));
      add(P.wall(330, 626, 300, 14));
      add(P.wall(330, 380, 14, 260));
      add(P.wall(616, 380, 14, 100));
      add(P.wall(616, 540, 14, 100));
      add(P.window(400, 380, 70, 14));
      add(P.window(330, 450, 14, 70));
      add(P.sofa(352, 400, 120, 46, '#ef476f'));
      add(P.bed(350, 528, 110, 92, '#4895ef'));
      add(P.table(496, 560, 80, 46, '#e9c46a'));
      add(P.plant(584, 592, 26));
      this.door = add(P.door(616, 480, 14, 60));
      this.fuse = add(P.fuseBox(598, 452));
      w.interact({
        x: 590, y: 465, r: 50, label: 'Switch off main power',
        enabled: () => !this.switched,
        use: () => this.switchOff()
      });

      // ----- Neighbourhood -----
      add(P.house(380, 760, 220, 150, '#f4a261'));
      add(P.house(700, 380, 170, 110, '#90be6d'));
      add(P.house(700, 640, 170, 120, '#e9c46a'));
      add(P.swings(680, 140));
      add(P.slide(830, 160));
      add(P.car(1010, 140, '#ef476f', true));
      [[300, 220], [520, 250], [820, 960], [1100, 320], [1230, 180], [1620, 200], [1720, 820], [1560, 980], [260, 700]].forEach(([x, y]) => add(P.tree(x, y, 30)));
      add(P.pole(1010, 380));
      add(P.pole(1010, 660));
      add(P.fallenWire(WIRE.x, WIRE.y, 140, 0.4));
      add(P.sign(880, 640, 'High ground', '#06d6a0', '>'));
      add(P.sign(1400, 520, 'Safe high ground', '#06d6a0', '>'));
      add(P.flowers(640, 560));

      // ----- Community centre: strong building with stairs to the roof -----
      add(P.wall(1060, 700, 240, 14, '#ffe5b4'));
      add(P.wall(1060, 700, 14, 240, '#ffe5b4'));
      add(P.wall(1286, 700, 14, 240, '#ffe5b4'));
      add(P.wall(1060, 926, 180, 14, '#ffe5b4'));
      add(P.cabinet(1100, 740, 50, 40, '#adb5bd'));
      add(P.cabinet(1200, 740, 46, 46, '#4cc9f0'));
      add(P.sign(1150, 980, 'Community centre (roof)', '#457b9d'));

      // ----- Hill top: rescue helpers -----
      [[1600, 480], [1660, 560]].forEach(([x, y], i) => {
        const h = w.addCharacter(new DR.Character(x, y, 'helper', { facing: 'left' }));
        h.walkT = i;
      });

      // ----- Zones -----
      w.zone('hilltop', { x: 1460, y: 0, w: 340, h: 1100 });
      w.zone('roof', ROOF, STAIRS);
      w.zone('home', { x: 330, y: 380, w: 300, h: 260 });

      // ----- People -----
      this.player = new DR.Character(420, 490, 'student');
      w.setPlayer(this.player);
      this.neighbours = [
        this.addNeighbour(490, 950, 'elderly', 'Grandma Amara', 70),
        this.addNeighbour(760, 235, 'child', 'Little Kai', 110)
      ];
    }

    addNeighbour(x, y, look, name, speed) {
      const ch = this.world.addCharacter(new DR.Character(x, y, look, { name, speed }));
      ch.bubble = '!';
      ch.mood = 'worried';
      const n = { ch, name, helped: false };
      this.world.interact({
        x: ch.x, y: ch.y, r: 50, label: 'Help ' + name,
        follow: ch,
        enabled: () => !n.helped,
        use: () => {
          n.helped = true;
          ch.bubble = null;
          ch.mood = null;
          this.world.followers.push(ch);
          this.game.tip('fl_neighbour', 'good');
          this.game.addPoints(50, ch.x, ch.y - 60, 'Offered help to ' + name);
          DR.Audio.play('good');
        }
      });
      return n;
    }

    switchOff() {
      this.switched = true;
      this.fuse.off = true;
      this.door.open = true;
      this.door.solidRects.forEach((s) => { s.enabled = false; });
      DR.Audio.play('switch');
      this.game.tip('fl_switch_done', 'good');
      this.game.addPoints(100, 598, 420, 'Switched off the main electricity');
      this.game.tip('fl_go_high', 'info');
    }

    depthAt(x, y) {
      return this.level - elevAt(x, y);
    }

    update(dt) {
      super.update(dt);
      const w = this.world;
      const p = this.player;
      this.level = Math.min(WATER_MAX, WATER_START + this.t * WATER_RATE);

      if (DR.Input.consumeAction()) this.useFocus();

      // water slows you down and pushes you toward the river
      const depth = this.depthAt(p.x, p.y);
      const opts = {};
      if (depth > 0 && !this.safe) {
        const d = Math.min(depth, 1.5);
        opts.speedMult = 0.55;
        opts.pushX = -18 * d;
        opts.pushY = 35 * d;
        this.game.hurt((6 + 10 * d) * dt, 'fl_water');
        if (Math.random() < dt * 8) w.emit({ x: p.x + DR.U.rand(-10, 10), y: p.y, vx: DR.U.rand(-30, 30), vy: -40, life: 0.5, size: 3, color: '#caf0f8', gravity: 160 });
        if (Math.random() < dt * 1.5) DR.Audio.play('splash');
      }
      w.updatePlayer(dt, opts);

      // the fallen power line: danger area grows when it is in water
      const wireR = this.depthAt(WIRE.x, WIRE.y) > 0 ? 120 : 75;
      if (Math.hypot(p.x - WIRE.x, p.y - WIRE.y) < wireR) this.game.hurt(18 * dt, 'fl_wire');

      // neighbours waiting for help turn to watch you
      this.neighbours.forEach((n) => {
        if (!n.helped) n.ch.facing = p.x < n.ch.x ? 'left' : 'right';
      });

      // trying to leave before switching off the power
      if (!this.switched && Math.hypot(p.x - 610, p.y - 510) < 34) this.game.tip('fl_switch_first', 'bad');

      // reached safety?
      if (!this.safe && (w.inZone('hilltop', p.x, p.y) || w.inZone('roof', p.x, p.y))) this.reachSafety();
      if (this.safe) {
        this.safeT += dt;
        if (this.safeT > 2.5 && !this.finished) {
          this.finished = true;
          this.game.completeLevel();
        }
      }

      // objective + marker
      if (!this.switched) {
        this.objective = 'Switch off the MAIN ELECTRICITY switch before you leave.';
        w.marker = { x: 598, y: 445 };
      } else if (!this.safe) {
        const left = this.neighbours.filter((n) => !n.helped).length;
        this.objective = 'Get to HIGH GROUND (the hill or the community centre roof)' + (left ? ` — ${left} neighbour${left > 1 ? 's' : ''} need help!` : '');
        w.marker = { x: 1560, y: 540 };
      } else {
        this.objective = 'You are safe on high ground!';
        w.marker = null;
      }

      this.meters = [{ label: 'Water', value: (this.level - WATER_START) / (WATER_MAX - WATER_START), color: '#4895ef' }];
      this.timerText = DR.U.formatTime(this.t);
      DR.Audio.ambient('rain', 0.5);
      this.finishUpdate(dt);
    }

    reachSafety() {
      this.safe = true;
      const p = this.player;
      this.game.addPoints(300, p.x, p.y - 50, 'Reached high ground');
      const helped = this.neighbours.filter((n) => n.helped);
      helped.forEach((n, i) => this.game.addPoints(150, p.x, p.y - 80 - i * 25, 'Brought ' + n.name + ' to safety'));
      this.game.tip(helped.length ? 'fl_safe' : 'fl_no_neighbours', 'good');
      DR.Audio.play('win');
    }

    drawWater(c, t) {
      const w = this.world;
      // flood water
      c.fillStyle = 'rgba(58, 134, 200, 0.78)';
      c.beginPath();
      c.moveTo(0, 0);
      for (let y = 0; y <= w.h; y += 20) c.lineTo(edgeX(this.level, y) + Math.sin(t * 2 + y / 30) * 3, y);
      c.lineTo(0, w.h);
      c.closePath();
      c.fill();
      // foamy edge
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 3;
      c.beginPath();
      for (let y = 0; y <= w.h; y += 20) {
        const x = edgeX(this.level, y) + Math.sin(t * 2 + y / 30) * 3;
        if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      // current lines flowing downstream
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const x = (i * 97) % 1500;
        const y = ((i * 211 + t * 70) % (w.h + 40)) - 20;
        if (x > edgeX(this.level, y) - 10) continue;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y + 8, x, y + 16); c.stroke();
      }
      // the community centre roof and stairs stay dry above the water
      c.fillStyle = G.pattern(c, 'roof');
      c.fillRect(1060, 700, 240, 240);
      G.box(c, STAIRS.x, STAIRS.y, STAIRS.w, STAIRS.h, { fill: '#ced4da', r: 2 });
      c.strokeStyle = '#8d99ae'; c.lineWidth = 3;
      for (let y = STAIRS.y + 14; y < STAIRS.y + STAIRS.h; y += 12) { c.beginPath(); c.moveTo(STAIRS.x + 4, y); c.lineTo(STAIRS.x + STAIRS.w - 4, y); c.stroke(); }
      // ripples around people standing in water
      w.characters.forEach((ch) => {
        if (this.depthAt(ch.x, ch.y) > 0) {
          c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
          c.beginPath(); c.ellipse(ch.x, ch.y, 14 + Math.sin(t * 5) * 2, 5, 0, 0, Math.PI * 2); c.stroke();
        }
      });
    }

    drawOverlay(c) {
      // gentle rain
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 137 + this.t * 60) % DR.CONFIG.WIDTH;
        const y = (i * 71 + this.t * 500) % DR.CONFIG.HEIGHT;
        c.moveTo(x, y); c.lineTo(x - 3, y + 12);
      }
      c.stroke();
    }
  }

  DR.registerLevel({
    id: 'flood',
    number: 2,
    name: 'Flood',
    place: 'Home by the river',
    color: '#4895ef',
    icon: 'raincoat',
    intro: 'Heavy rain has been falling for days and the river is getting high. Pack your kit — a flood warning could come at any moment.',
    briefing: 'Water is rising from the river! Switch off the main electricity, then get to higher ground: the hill or the roof of the community centre. Never walk through floodwater, keep away from fallen power lines, and help your neighbours on the way.',
    kitExtras: { good: ['raincoat'], bad: ['hairdryer'] },
    Scene: FloodScene
  });
})();
