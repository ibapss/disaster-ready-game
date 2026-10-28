/*
 * LEVEL 4 — STORM / CYCLONE at home.
 *
 *  1. Before the storm arrives: secure 4 loose objects in the yard and
 *     close the shutters on 4 windows.
 *  2. Shelter in the inner room (the bathroom has no windows).
 *  3. Ride out the storm (the calm "eye" passes in the middle — stay inside!).
 *  4. Listen to the radio alert, then follow the evacuation route to the
 *     cyclone shelter, avoiding floodwater and a fallen power line.
 */
(function () {
  const P = DR.P;
  const G = DR.G;

  const PREP_TIME = 75;                 // seconds until the storm arrives
  const STORM_A = 8;                    // first part of the storm
  const EYE = 5;                        // calm eye
  const STORM_B = 7;                    // second part
  const HOUSE = { x: 160, y: 160, w: 640, h: 480 };
  const YARD = { x: 100, y: 100, w: 800, h: 660 };
  const ROUTE = [{ x: 710, y: 780 }, { x: 710, y: 840 }, { x: 1140, y: 840 }, { x: 1140, y: 535 }, { x: 1380, y: 535 }];
  const WIRE = { x: 1000, y: 470 };

  class StormScene extends DR.Scene {
    constructor(game) {
      super(game);
      this.state = 'prepare';       // prepare → storm → after → evacuate → arrived
      this.stateT = 0;
      this.stormIn = PREP_TIME;
      this.wind = 0.15;
      this.sheltered = false;
      this.routeIdx = 0;
      this.build();
      game.radio('CYCLONE WARNING: A severe cyclone will reach your area soon. Secure loose objects outside, close windows and shutters, and get ready to shelter in a small inner room.');
      game.tip('st_warning', 'bad');
      DR.Audio.play('alarm');
    }

    build() {
      const w = (this.world = new DR.World(1600, 1100));
      const add = (p) => w.add(p);
      this.trees = [];
      w.ground = (c) => {
        G.floor(c, 'grass', 0, 0, w.w, w.h);
        G.floor(c, 'road', 0, 800, w.w, 80);
        G.floor(c, 'road', 1100, 0, 80, 880);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.setLineDash([20, 18]);
        c.beginPath(); c.moveTo(0, 840); c.lineTo(w.w, 840); c.moveTo(1140, 0); c.lineTo(1140, 800); c.stroke(); c.setLineDash([]);
        G.floor(c, 'paving', 1180, 505, 240, 60);
        G.floor(c, 'paving', 680, 640, 60, 120);
        G.floor(c, 'wood', 160, 160, 640, 480);
        G.floor(c, 'kitchen', 486, 176, 298, 224);
        G.floor(c, 'tiles', 446, 416, 164, 208);
        G.floor(c, 'tiles', 626, 416, 158, 208);
        const tag = (s, x, y) => G.label(c, s, x, y, { size: 12, color: 'rgba(61,58,75,0.35)', outline: 'rgba(0,0,0,0)' });
        tag('LIVING ROOM', 320, 385);
        tag('KITCHEN', 640, 385);
        tag('BEDROOM', 230, 608);
        tag('BATHROOM', 528, 608);
        tag('(no windows)', 528, 594);
        tag('HALL', 705, 440);
      };
      w.afterFloor = (c, t) => this.drawFlood(c, t);

      // ----- house walls -----
      [[160, 160, 640, 16], [160, 160, 16, 480], [784, 160, 16, 480], [160, 624, 520, 16], [740, 624, 60, 16],
        [160, 400, 120, 16], [350, 400, 310, 16], [720, 400, 80, 16],
        [470, 176, 16, 84], [470, 320, 16, 80],
        [430, 416, 16, 208], [610, 416, 16, 84], [610, 560, 16, 64]].forEach(([x, y, ww, hh]) => add(P.wall(x, y, ww, hh)));

      // ----- windows to close -----
      this.windows = [
        { p: add(P.window(220, 160, 100, 16)), x: 270, y: 200, room: { x: 176, y: 176, w: 294, h: 224 } },
        { p: add(P.window(160, 230, 16, 90)), x: 202, y: 275, room: { x: 176, y: 176, w: 294, h: 224 } },
        { p: add(P.window(560, 160, 120, 16)), x: 620, y: 200, room: { x: 486, y: 176, w: 298, h: 224 } },
        { p: add(P.window(160, 470, 16, 100)), x: 202, y: 520, room: { x: 176, y: 416, w: 254, h: 208 } }
      ];
      this.windows.forEach((win) => {
        w.interact({
          x: win.x, y: win.y, r: 50, label: 'Close the shutters',
          enabled: () => !win.p.closed && this.state === 'prepare',
          use: () => {
            win.p.closed = true;
            DR.Audio.play('switch');
            this.game.tip('st_window', 'good');
            this.game.addPoints(50, win.x, win.y - 40, 'Closed a window shutter');
          }
        });
      });

      // ----- furniture -----
      add(P.sofa(190, 330, 150, 50, '#6a4c93'));
      add(P.table(260, 250, 90, 44, '#bc8a5f'));
      add(P.fridge(500, 180, 52, 56));
      add(P.counter(736, 190, 44, 150));
      add(P.table(560, 280, 110, 60, '#f4d35e'));
      add(P.bed(300, 436, 110, 150, '#4361ee'));
      add(P.wardrobe(186, 424, 80, 34));
      add(P.counter(452, 422, 64, 46, { sink: 12 }));
      add(P.plant(745, 580, 28));
      add(P.mat(684, 600, 52, 22));

      // ----- the safe inner room -----
      this.radioProp = add(P.radio(580, 440));
      w.interact({
        x: 528, y: 490, r: 56, label: 'Take shelter here',
        enabled: () => !this.sheltered && (this.state === 'prepare' || this.state === 'storm'),
        use: () => this.shelter()
      });
      w.interact({
        x: 580, y: 450, r: 80,
        whileLocked: true, // can be used while sitting in the shelter
        label: this.game.hasItem('radio') ? 'Listen to your battery radio' : 'Listen to the radio',
        enabled: () => this.state === 'after',
        use: () => this.listen()
      });

      // ----- yard, fence and loose objects -----
      [[100, 100, 800, 12], [100, 100, 12, 660], [888, 100, 12, 660], [100, 748, 560, 12], [760, 748, 140, 12]].forEach(([x, y, ww, hh]) => add(P.fence(x, y, ww, hh)));
      this.loose = [[260, 700, 'chair', 'garden chair'], [480, 700, 'pot', 'flower pot'], [850, 250, 'bin', 'rubbish bin'], [845, 520, 'bike', 'bicycle']].map(([x, y, kind, name]) => {
        const p = add(P.looseObject(x, y, kind));
        p.solidRects.forEach((s) => { s.enabled = false; });
        w.interact({
          x, y, r: 46, label: 'Secure the ' + name,
          enabled: () => !p.secured && !p.gone && this.state === 'prepare',
          use: () => {
            p.secured = true;
            DR.Audio.play('switch');
            this.game.tip('st_secured', 'good');
            this.game.addPoints(50, x, y - 40, 'Secured the ' + name);
          }
        });
        return p;
      });

      // ----- outside -----
      add(P.building(1220, 280, 320, 220, { label: 'CYCLONE SHELTER', labelColor: '#2a9d8f', wall: '#cde7b0' }));
      add(P.house(100, 920, 200, 140, '#ef476f'));
      add(P.house(420, 920, 200, 140, '#4cc9f0'));
      add(P.pole(960, 380));
      add(P.fallenWire(WIRE.x, WIRE.y, 140, 0.6));
      add(P.fallenTree(930, 290, 150));
      add(P.fallenTree(1095, 180, 160));
      [[1000, 120], [950, 650], [60, 980], [1300, 140], [1500, 700], [1300, 1000], [1560, 300]].forEach(([x, y]) => this.trees.push(add(P.tree(x, y, 32))));
      add(P.sign(640, 788, 'Evacuation route', '#06d6a0', '>'));
      add(P.sign(1080, 760, 'Shelter', '#06d6a0', '^'));
      add(P.sign(1200, 610, 'Shelter', '#06d6a0', '>'));
      [[880, 840, 0], [1000, 840, 0], [1140, 760, -Math.PI / 2], [1140, 650, -Math.PI / 2], [1260, 535, 0]].forEach(([x, y, a]) => add(P.arrow(x, y, a, 'rgba(6,214,160,0.85)')));

      // ----- zones -----
      w.zone('house', HOUSE);
      w.zone('yard', YARD);
      w.zone('inner', { x: 446, y: 416, w: 164, h: 208 });
      w.zone('flood', { x: 1200, y: 780, w: 400, h: 140 });
      w.zone('route', { x: 640, y: 730, w: 140, h: 160 }, { x: 600, y: 790, w: 620, h: 100 }, { x: 1080, y: 470, w: 130, h: 420 }, { x: 1170, y: 480, w: 280, h: 110 });
      w.zone('shelter', { x: 1330, y: 495, w: 100, h: 70 });

      this.player = new DR.Character(700, 520, 'student');
      w.setPlayer(this.player);
    }

    allDone() {
      return this.windows.every((w) => w.p.closed) && this.loose.every((l) => l.secured);
    }

    shelter() {
      const p = this.player;
      if (this.state === 'prepare' && !this.allDone()) {
        this.game.tip('st_shelter_early', 'info');
        return;
      }
      this.sheltered = true;
      p.x = 528;
      p.y = 492;
      p.pose = 'cover';
      p.locked = true;
      p.facing = 'down';
      DR.Audio.play('good');
      if (!this.shelterScored) {
        this.shelterScored = true;
        this.game.addPoints(150, p.x, p.y - 50, 'Sheltered in an inner room');
        this.game.tip('st_shelter', 'good');
      }
      if (this.state === 'prepare') this.stormIn = Math.min(this.stormIn, 3);
    }

    listen() {
      this.radioProp.beeping = false;
      this.setState('evacuate');
      DR.Audio.play('radio');
      this.game.radio('OFFICIAL ALERT: The cyclone has moved away, but floodwater is rising in low-lying streets. Residents must evacuate now to the CYCLONE SHELTER. Follow the green evacuation signs. Avoid floodwater and fallen power lines.');
      this.game.tip('st_evacuate', 'info');
      this.game.addPoints(100, 580, 400, 'Listened to the official alert');
      if (this.sheltered) this.unshelter();
    }

    unshelter() {
      const p = this.player;
      this.sheltered = false;
      p.pose = 'stand';
      p.locked = false;
      p.y = 520;
    }

    setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    startStorm() {
      this.setState('storm');
      DR.Audio.play('alarm');
      this.game.radio('The cyclone has arrived. Stay indoors in your safe room, away from windows.');
      this.game.tip('st_power_out', 'info');
      if (this.game.hasItem('torch')) this.game.tip('st_torch', 'good');
      // anything not secured blows away
      const flying = this.loose.filter((l) => !l.secured);
      flying.forEach((l) => {
        l.flying = true;
        this.game.addPoints(-20, l.x + 18, l.y - 20, 'Loose object blew away');
      });
      if (flying.length) this.game.tip('st_flying', 'bad');
      const open = this.windows.filter((win) => !win.p.closed).length;
      if (open) this.game.addPoints(-20 * open, 480, 160, 'Windows left unprotected');
    }

    update(dt) {
      super.update(dt);
      this.stateT += dt;
      const w = this.world;
      const p = this.player;

      if (DR.Input.consumeAction()) this.useFocus();

      // moving while sheltering = stand up
      const mv = DR.Input.getMove();
      if (this.sheltered && Math.hypot(mv.x, mv.y) > 0.5) {
        this.unshelter();
        if (this.state === 'storm') this.game.tip('st_left_shelter', 'bad');
      }
      // walking out of the safe room before the official all-clear costs points
      const inInner = w.inZone('inner', p.x, p.y);
      if ((this.state === 'storm' || this.state === 'after') && this.wasInner && !inInner && !this.leftPenalty) {
        this.leftPenalty = true;
        this.game.addPoints(-50, p.x, p.y - 50, 'Left the safe room too early');
        this.game.tip('st_left_shelter', 'bad');
      }
      this.wasInner = inInner;

      // wind strength 0..1
      let target = 0.15;
      if (this.state === 'prepare') target = 0.15 + (1 - this.stormIn / PREP_TIME) * 0.35;
      if (this.state === 'storm') target = this.stateT < STORM_A ? 1 : this.stateT < STORM_A + EYE ? 0.05 : 1;
      if (this.state === 'after' || this.state === 'evacuate' || this.state === 'arrived') target = 0.12;
      this.wind += (target - this.wind) * Math.min(1, dt * 1.5);

      const outsideHouse = !w.inZone('house', p.x, p.y);
      const opts = {};
      if (this.state === 'storm' && outsideHouse) opts.pushX = 70 * this.wind;
      if (this.state === 'evacuate' && w.inZone('flood', p.x, p.y)) opts.speedMult = 0.5;
      w.updatePlayer(dt, opts);

      if (this.state === 'prepare') {
        this.stormIn -= dt;
        const done = this.windows.filter((x) => x.p.closed).length + this.loose.filter((l) => l.secured).length;
        this.objective = done < 8
          ? `Before the storm: secure the yard and close the shutters (${done}/8 done), then shelter in the bathroom.`
          : 'All secured! Go to the BATHROOM (inner room, no windows) and take shelter.';
        this.timerText = 'Storm ' + DR.U.formatTime(this.stormIn);
        w.marker = done < 8 ? this.nextTask() : { x: 528, y: 470 };
        if (this.stormIn <= 0) this.startStorm();
      } else if (this.state === 'storm') {
        const inEye = this.stateT > STORM_A && this.stateT < STORM_A + EYE;
        if (inEye && !this.eyeSaid) {
          this.eyeSaid = true;
          this.game.radio('The EYE of the cyclone is passing over. It may seem calm, but dangerous winds will return soon. STAY INSIDE!');
          this.game.tip('st_eye', 'info');
        }
        if (this.stateT > STORM_A + EYE && !this.returnSaid) {
          this.returnSaid = true;
          this.game.radio('The winds have returned from the other direction. Keep sheltering.');
        }
        this.objective = inEye ? 'The eye is passing — it seems calm, but STAY in your safe room!' : (this.sheltered || w.inZone('inner', p.x, p.y) ? 'Stay sheltered in the inner room until it is over.' : 'Get to the inner room (bathroom) and take shelter!');
        w.marker = this.sheltered ? null : { x: 528, y: 470 };
        this.applyStormDanger(dt, inEye);
        if (this.stateT > STORM_A + EYE + STORM_B) {
          this.setState('after');
          this.radioProp.beeping = true;
          DR.Audio.play('radio');
          this.game.tip('st_listen', 'info');
        }
        this.timerText = DR.U.formatTime(this.t);
      } else if (this.state === 'after') {
        this.objective = 'The radio is beeping. Listen to the official alert!';
        w.marker = { x: 580, y: 440 };
        if (Math.floor(this.stateT * 2) % 4 === 0 && Math.floor((this.stateT - dt) * 2) % 4 !== 0) DR.Audio.play('tick');
      } else if (this.state === 'evacuate') {
        this.updateEvacuation(dt);
      } else if (this.state === 'arrived') {
        this.objective = 'You are safe in the cyclone shelter!';
        w.marker = null;
        if (this.stateT > 2.5 && !this.finished) {
          this.finished = true;
          this.game.completeLevel();
        }
      }
      if (this.state !== 'prepare' && this.state !== 'storm') this.timerText = DR.U.formatTime(this.t);

      this.updateEffects(dt);
      this.meters = [{ label: 'Wind', value: this.wind, color: '#7b2cbf' }];
      this.finishUpdate(dt);
    }

    /** Points the marker at the closest unfinished job. */
    nextTask() {
      const p = this.player;
      const jobs = this.windows.filter((x) => !x.p.closed).map((x) => ({ x: x.x, y: x.y }))
        .concat(this.loose.filter((l) => !l.secured).map((l) => ({ x: l.x + 18, y: l.y + 4 })));
      jobs.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      return jobs[0] || null;
    }

    applyStormDanger(dt, inEye) {
      const w = this.world;
      const p = this.player;
      if (!w.inZone('house', p.x, p.y)) {
        this.game.hurt((inEye ? 4 : 10) * dt, inEye ? 'st_eye' : 'st_outside');
        return;
      }
      if (inEye) return;
      const nearOpen = this.windows.some((win) => !win.p.closed && DR.U.inShape(p.x, p.y, win.room) && Math.hypot(p.x - win.x, p.y - win.y) < 130);
      if (nearOpen) this.game.hurt(5 * dt, 'st_glass');
    }

    updateEvacuation(dt) {
      const w = this.world;
      const p = this.player;
      // move the marker along the route as you reach each point
      while (this.routeIdx < ROUTE.length - 1 && Math.hypot(p.x - ROUTE[this.routeIdx].x, p.y - ROUTE[this.routeIdx].y) < 60) this.routeIdx++;
      if (w.inZone('house', p.x, p.y)) w.marker = { x: 710, y: 615 };
      else w.marker = ROUTE[this.routeIdx];
      this.objective = 'EVACUATE: follow the green signs to the CYCLONE SHELTER.';

      if (w.inZone('flood', p.x, p.y)) this.game.hurt(8 * dt, 'st_floodwater');
      if (Math.hypot(p.x - WIRE.x, p.y - WIRE.y) < 85) this.game.hurt(18 * dt, 'st_wire');
      if (!w.inZone('yard', p.x, p.y) && !w.inZone('route', p.x, p.y) && !w.inZone('shelter', p.x, p.y)) this.game.tip('st_follow_route', 'info');

      if (w.inZone('shelter', p.x, p.y)) {
        this.setState('arrived');
        this.game.addPoints(300, p.x, p.y - 50, 'Reached the cyclone shelter');
        this.game.tip('st_arrived', 'good');
        DR.Audio.play('win');
        p.visible = false;
      }
    }

    updateEffects(dt) {
      const w = this.world;
      const storming = this.state === 'storm';
      // things that were not tied down fly away
      this.loose.forEach((l) => {
        l.wind = this.wind;
        if (l.flying && !l.gone) {
          l.x += 260 * dt;
          l.y -= 30 * dt;
          const prev = l.draw;
          if (!l.wrapped) {
            l.wrapped = true;
            const ox = l.x;
            const oy = l.y;
            l.draw = function (c, t, world) {
              c.save(); c.translate(this.x - ox, this.y - oy); prev.call(this, c, t, world); c.restore();
            };
          }
          if (l.x > 1700) { l.gone = true; this.world.remove(l); }
        }
      });
      // leaves blowing in the wind
      if (Math.random() < dt * 30 * this.wind) {
        const cx = w.cam.x;
        const cy = w.cam.y;
        w.emit({ x: cx - 20, y: cy + DR.U.rand(0, 540), vx: DR.U.rand(250, 450) * this.wind + 40, vy: DR.U.rand(-30, 30), life: 3, size: 4, color: DR.U.pick(['#52b788', '#95d5b2', '#d4a373']), shape: 'leaf' });
      }
      this.trees.forEach((t) => { t.sway = 1 + this.wind * 4; });
      DR.Audio.ambient('wind', storming ? 0.3 + this.wind * 0.7 : 0.15 + this.wind * 0.5);
    }

    drawFlood(c, t) {
      c.fillStyle = 'rgba(58, 134, 200, 0.75)';
      G.rr(c, 1200, 785, 420, 130, 40);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = 1220 + ((i * 53 + t * 30) % 370);
        const y = 805 + (i * 37) % 90;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 5, x + 16, y); c.stroke();
      }
      if (this.state === 'evacuate' || this.state === 'after') G.label(c, 'FLOODED — go around', 1400, 850, { size: 13, color: '#fff', outline: 'rgba(0,0,0,0.3)' });
    }

    drawOverlay(c) {
      const W = DR.CONFIG.WIDTH;
      const H = DR.CONFIG.HEIGHT;
      // rain: more and slanted with stronger wind
      const drops = Math.floor(30 + this.wind * 140);
      c.strokeStyle = 'rgba(220, 235, 255, 0.45)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < drops; i++) {
        const x = (i * 137 + this.t * (80 + this.wind * 500)) % (W + 100) - 50;
        const y = (i * 71 + this.t * 600) % H;
        c.moveTo(x, y); c.lineTo(x - 4 - this.wind * 18, y + 14);
      }
      c.stroke();
      // power cut during the storm: dark except around you (bigger with a torch)
      if (this.state === 'storm') {
        const p = this.world.player;
        const sx = p.x - this.world.cam.x;
        const sy = p.y - 20 - this.world.cam.y;
        const r = this.game.hasItem('torch') ? 240 : 120;
        const g = c.createRadialGradient(sx, sy, r * 0.3, sx, sy, r);
        g.addColorStop(0, 'rgba(15, 20, 50, 0)');
        g.addColorStop(1, 'rgba(15, 20, 50, 0.62)');
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
      } else {
        c.fillStyle = `rgba(40, 50, 90, ${this.wind * 0.18})`;
        c.fillRect(0, 0, W, H);
      }
    }
  }

  DR.registerLevel({
    id: 'storm',
    number: 4,
    name: 'Storm / Cyclone',
    place: 'Home and neighbourhood',
    color: '#7b2cbf',
    icon: 'radio',
    intro: 'The weather service is tracking a cyclone heading for your town. Pack your kit while there is still time!',
    briefing: 'A cyclone is coming! Secure the loose objects in the yard and close the window shutters, then shelter in the bathroom (an inner room with no windows). Stay there until the radio tells you what to do, then follow the evacuation route.',
    kitExtras: { good: ['radio'], bad: ['candles'] },
    Scene: StormScene
  });
})();
