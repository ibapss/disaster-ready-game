/*
 * LEVEL 1 — EARTHQUAKE at school.
 *
 *  1. The ground shakes: get under a sturdy desk and press Action
 *     (Drop, Cover and Hold On). Stay away from windows, shelves and lights.
 *  2. When the shaking stops, walk out to the assembly area.
 *  3. An aftershock hits outside: drop and cover again, away from
 *     buildings, trees and power lines.
 */
(function () {
  const P = DR.P;
  const G = DR.G;

  // How long things last (seconds)
  const CALM_TIME = 4;
  const MAX_SHAKE = 16;
  const AFTERSHOCK_TIME = 6;

  // Health lost per second in dangerous places while shaking
  const DAMAGE = { exposed: 3, danger: 7, corridor: 6, stairs: 9, outside: 8 };

  const TREES = [[120, 700], [170, 900], [990, 640], [880, 880], [1030, 800], [80, 980]];

  const EXIT_ROUTE = [{ x: 545, y: 315 }, { x: 660, y: 315 }, { x: 660, y: 520 }, { x: 650, y: 600 }, { x: 650, y: 760 }];

  class EarthquakeScene extends DR.Scene {
    constructor(game) {
      super(game);
      this.state = 'calm';
      this.stateT = 0;
      this.shakeEnd = MAX_SHAKE;
      this.covered = null;      // the desk we are hiding under
      this.dropped = false;     // crouching in the open (aftershock)
      this.outsideT = 0;
      this.build();
      game.tip('eq_calm', 'info');
    }

    build() {
      const w = (this.world = new DR.World(1500, 1000));
      const add = (p) => w.add(p);
      w.ground = (c) => {
        G.floor(c, 'grass', 0, 0, w.w, w.h);
        G.floor(c, 'concrete', 610, 556, 80, 220);
        G.floor(c, 'concrete', 30, 556, 740, 34);
        G.floor(c, 'road', 1180, 0, 90, w.h);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.setLineDash([20, 18]);
        c.beginPath(); c.moveTo(1225, 0); c.lineTo(1225, w.h); c.stroke(); c.setLineDash([]);
        G.floor(c, 'school', 40, 40, 720, 520);
        G.floor(c, 'tiles', 576, 56, 168, 488);
        // basketball court
        G.box(c, 820, 80, 280, 170, { fill: '#e76f51', r: 6 });
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(832, 92, 256, 146);
        c.beginPath(); c.moveTo(960, 92); c.lineTo(960, 238); c.stroke();
        G.circle(c, 960, 165, 24, null, '#fff', 3);
      };

      // ----- School building -----
      add(P.wall(40, 40, 720, 16));
      add(P.wall(40, 544, 570, 16));
      add(P.wall(690, 544, 70, 16));
      add(P.wall(40, 40, 16, 520));
      add(P.wall(744, 40, 16, 520));
      add(P.wall(560, 56, 16, 224));
      add(P.wall(560, 350, 16, 194));
      [90, 230, 370].forEach((x) => add(P.window(x, 40, 80, 16)));
      [150, 330].forEach((y) => add(P.window(40, y, 16, 80)));
      add(P.window(744, 300, 16, 80));
      add(P.whiteboard(549, 100, 10, 150));
      add(P.stairs(584, 60, 152, 104, 'STAIRS UP'));
      add(P.mat(612, 520, 76, 22, '#90be6d'));

      // shelves and lights (dangerous during shaking)
      this.shelves = [add(P.bookshelf(80, 496, 170, 40)), add(P.bookshelf(290, 496, 90, 40))];
      this.lights = [add(P.hangingLight(192, 282)), add(P.hangingLight(342, 282))];

      // desks: two near the windows, the others safer
      this.desks = [];
      const deskSpots = [[80, 180, true], [230, 180, false], [380, 180, false], [80, 340, true], [230, 340, false], [380, 340, false], [440, 92, true]];
      deskSpots.forEach(([x, y, nearWindow], i) => {
        if (i < 6) add(P.chair(x + 24, y + 46, '#90be6d'));
        const d = add(P.desk(x, y, i === 6 ? 84 : 70, 38));
        d.nearWindow = nearWindow;
        d.cx = x + d.w / 2;
        d.cy = y + 22;
        this.desks.push(d);
        w.interact({
          x: d.cx, y: d.cy + 10, r: 56, promptY: 52,
          label: 'Drop, Cover & Hold On',
          enabled: () => this.isShaking() && !this.covered && !this.dropped && !d.occupied,
          use: () => this.takeCover(d)
        });
      });

      // ----- Outside -----
      add(P.paintedArea(330, 760, 420, 200, 'ASSEMBLY AREA'));
      add(P.sign(320, 760, 'Assembly area', '#06d6a0'));
      TREES.forEach(([x, y]) => add(P.tree(x, y, 34)));
      add(P.building(1300, 80, 180, 300, { label: 'HALL', wall: '#ffd6a5' }));
      add(P.shed(800, 600, 110, 60));
      add(P.bench(450, 610, 70, 20));
      [100, 350, 600, 850].forEach((y) => add(P.pole(1150, y)));
      add(P.powerLines([[1150, 100], [1150, 350], [1150, 600], [1150, 850]]));
      add(P.flowers(80, 590));
      add(P.flowers(700, 600));

      // ----- Zones used by the rules -----
      w.zone('inside', { x: 40, y: 40, w: 720, h: 520 });
      w.zone('classroom', { x: 56, y: 56, w: 504, h: 488 });
      w.zone('corridor', { x: 576, y: 56, w: 168, h: 488 });
      w.zone('stairs', { x: 576, y: 56, w: 168, h: 112 });
      w.zone('windows', { x: 56, y: 56, w: 504, h: 80 }, { x: 56, y: 56, w: 80, h: 488 });
      w.zone('shelves', { x: 56, y: 444, w: 344, h: 100 });
      w.zone('lights', { cx: 192, cy: 282, r: 40 }, { cx: 342, cy: 282, r: 40 });
      w.zone('assembly', { x: 330, y: 760, w: 420, h: 200 });
      w.zone('nearBuilding', { x: 0, y: 0, w: 830, h: 640 }, { x: 1240, y: 20, w: 300, h: 420 }, { x: 770, y: 570, w: 170, h: 120 });
      w.zone('nearTree', ...TREES.map(([x, y]) => ({ cx: x, cy: y - 20, r: 75 })));
      w.zone('nearLines', { x: 1090, y: 0, w: 120, h: 1000 });

      // ----- People -----
      this.player = new DR.Character(270, 430, 'student', { facing: 'up' });
      w.setPlayer(this.player);
      this.teacher = w.addCharacter(new DR.Character(505, 200, 'teacher', { facing: 'left', speed: 80 }));
      this.mates = [
        { ch: w.addCharacter(new DR.Character(265, 238, 'classmateA', { facing: 'up', speed: 85 })), desk: this.desks[1], spot: { x: 470, y: 850 } },
        { ch: w.addCharacter(new DR.Character(415, 398, 'classmateB', { facing: 'up', speed: 85 })), desk: this.desks[5], spot: { x: 560, y: 880 } }
      ];
    }

    isShaking() {
      return this.state === 'shaking' || this.state === 'aftershock';
    }

    setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    // ---------- Player actions ----------
    takeCover(desk) {
      const p = this.player;
      this.covered = desk;
      desk.occupied = true;
      p.x = desk.cx;
      p.y = desk.cy;
      p.pose = 'cover';
      p.locked = true;
      DR.Audio.play('good');
      if (this.state === 'shaking' && !this.coverScored) {
        this.coverScored = true;
        const quick = Math.max(0, 100 - Math.floor(this.stateT) * 15);
        if (desk.nearWindow) {
          this.game.addPoints(100, p.x, p.y - 50, 'Took cover (near windows)');
          this.game.tip('eq_cover_window', 'info');
        } else {
          this.game.addPoints(200, p.x, p.y - 50, 'Drop, Cover and Hold On under a safe desk');
          this.game.tip('eq_cover_good', 'good');
        }
        if (quick > 0) this.game.addPoints(quick, p.x, p.y - 75, 'Quick reaction bonus');
        this.shakeEnd = Math.min(MAX_SHAKE, Math.max(8, this.stateT + 5));
      } else if (this.state === 'aftershock') {
        this.scoreAftershock();
      }
    }

    leaveCover() {
      const p = this.player;
      const d = this.covered;
      d.occupied = false;
      this.covered = null;
      p.pose = 'stand';
      p.locked = false;
      p.x = d.cx;
      p.y = d.y + d.h + 12;
      if (this.isShaking()) this.game.tip('eq_stay_covered', 'bad');
    }

    dropInOpen() {
      const w = this.world;
      const p = this.player;
      if (w.inZone('nearBuilding', p.x, p.y) || w.inZone('nearTree', p.x, p.y) || w.inZone('nearLines', p.x, p.y)) {
        this.game.tip('eq_drop_danger', 'bad');
        DR.Audio.play('bad');
        return;
      }
      this.dropped = true;
      p.pose = 'drop';
      p.locked = true;
      DR.Audio.play('good');
      this.game.tip('eq_drop_good', 'good');
      this.scoreAftershock();
    }

    scoreAftershock() {
      if (this.aftershockScored) return;
      this.aftershockScored = true;
      const p = this.player;
      this.game.addPoints(150, p.x, p.y - 50, 'Reacted to the aftershock');
      if (this.stateT < 2.5) this.game.addPoints(50, p.x, p.y - 75, 'Fast aftershock reaction');
    }

    // ---------- Each frame ----------
    update(dt) {
      super.update(dt);
      this.stateT += dt;
      const w = this.world;
      const p = this.player;

      if (DR.Input.consumeAction()) {
        if (!this.useFocus()) {
          if (this.state === 'aftershock' && !this.dropped && !this.covered && !w.inZone('inside', p.x, p.y)) this.dropInOpen();
          else if (this.state === 'shaking' && !this.covered) this.game.tip('eq_start', 'info');
        }
      }

      // moving while hiding = leave cover
      const mv = DR.Input.getMove();
      if ((this.covered || this.dropped) && Math.hypot(mv.x, mv.y) > 0.5 && this.stateT > 0.3) {
        if (this.covered) this.leaveCover();
        else {
          this.dropped = false;
          p.pose = 'stand';
          p.locked = false;
          if (this.isShaking()) this.game.tip('eq_stay_covered', 'bad');
        }
      }

      const shaking = this.isShaking();
      w.updatePlayer(dt, shaking ? { speedMult: 0.75, wobble: this.state === 'shaking' ? 40 : 20 } : {});

      // ----- state machine -----
      if (this.state === 'calm') {
        this.objective = 'Class is starting… look around your classroom.';
        if (this.stateT > CALM_TIME) {
          this.setState('shaking');
          this.game.tip('eq_start', 'bad');
          DR.Audio.play('alarm');
        }
      } else if (this.state === 'shaking') {
        this.objective = this.covered ? 'Hold on! Stay under the desk until the shaking stops.' : 'EARTHQUAKE! Get under a sturdy desk and press Action.';
        this.applyShakeDanger(dt, false);
        if (this.stateT > 4) this.shelves.forEach((s) => { s.fallen = true; });
        if (this.stateT > this.shakeEnd) {
          this.setState('evacuate');
          this.game.tip('eq_stopped', 'info');
          this.startEvacuation();
        }
      } else if (this.state === 'evacuate' || this.state === 'evacuate2') {
        const outside = !w.inZone('inside', p.x, p.y);
        if (this.covered || this.dropped) this.objective = 'The shaking stopped. Move to leave cover, then go outside.';
        else this.objective = this.state === 'evacuate'
          ? 'Walk calmly outside to the ASSEMBLY AREA.'
          : 'Go to the assembly area — away from buildings, trees and power lines.';
        if (w.inZone('stairs', p.x, p.y)) this.game.tip('eq_stairs_after', 'info');
        this.outsideT = outside ? this.outsideT + dt : 0;
        if (this.state === 'evacuate' && (this.outsideT > 1.5 || w.inZone('assembly', p.x, p.y))) {
          this.setState('aftershock');
          this.aftershockScored = false;
          this.game.tip('eq_aftershock', 'bad');
          DR.Audio.play('alarm');
        }
        if (this.state === 'evacuate2' && w.inZone('assembly', p.x, p.y)) {
          this.setState('done');
          this.game.addPoints(300, p.x, p.y - 50, 'Reached the assembly area');
          this.game.tip('eq_assembly', 'good');
          DR.Audio.play('win');
        }
      } else if (this.state === 'aftershock') {
        this.objective = 'AFTERSHOCK! Drop, Cover and Hold On — away from buildings, trees and power lines.';
        this.applyShakeDanger(dt, true);
        if (this.stateT > AFTERSHOCK_TIME) {
          this.setState('evacuate2');
          if (this.dropped) {
            this.dropped = false;
            p.pose = 'stand';
            p.locked = false;
          }
          if (this.covered) this.leaveCover();
        }
      } else if (this.state === 'done') {
        this.objective = 'Safe! Wait with your class at the assembly area.';
        if (this.stateT > 2.5) {
          this.setState('finished');
          this.game.completeLevel();
        }
      }

      this.updateNPCs(dt);
      this.updateMarker();
      this.updateEffects(dt);
      this.timerText = DR.U.formatTime(this.t);
      this.finishUpdate(dt);
    }

    /** Lose health in dangerous spots while the ground shakes. */
    applyShakeDanger(dt, isAftershock) {
      if (this.covered || this.dropped) return;
      const w = this.world;
      const p = this.player;
      const inside = w.inZone('inside', p.x, p.y);
      let rate = DAMAGE.exposed;
      let tip = isAftershock ? 'eq_aftershock' : 'eq_stay_covered';
      if (inside) {
        if (w.inZone('stairs', p.x, p.y)) { rate = DAMAGE.stairs; tip = 'eq_stairs'; }
        else if (w.inZone('corridor', p.x, p.y)) { rate = DAMAGE.corridor; tip = isAftershock ? 'eq_aftershock' : 'eq_dont_run'; }
        else if (w.inZone('windows', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_windows'; }
        else if (w.inZone('shelves', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_shelves'; }
        else if (w.inZone('lights', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_lights'; }
      } else if (!isAftershock) {
        rate = DAMAGE.outside; tip = 'eq_dont_run';
      } else if (w.inZone('nearLines', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_near_lines'; }
      else if (w.inZone('nearTree', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_near_tree'; }
      else if (w.inZone('nearBuilding', p.x, p.y)) { rate = DAMAGE.danger; tip = 'eq_near_building'; }
      if (isAftershock) rate *= 0.7;
      // give a short moment to react before it starts to hurt
      if (this.stateT > 1.2) this.game.hurt(rate * dt, tip);
    }

    /** Teacher and classmates show the right thing to do. */
    startEvacuation() {
      this.evacuating = true;
      this.mates.forEach((m, i) => {
        m.ch.pose = 'stand';
        m.desk.occupied = false;
        const out = i === 0 ? [{ x: 265, y: 280 }] : [{ x: 470, y: 400 }];
        m.ch.path = out.concat(EXIT_ROUTE, [m.spot]);
        m.delay = 1 + i * 0.8;
      });
      this.teacher.pose = 'stand';
      this.teacher.path = EXIT_ROUTE.concat([{ x: 640, y: 820 }]);
      this.teacher.delay = 0.5;
    }

    updateNPCs(dt) {
      const people = [this.teacher].concat(this.mates.map((m) => m.ch));
      if (this.state === 'shaking') {
        // everyone takes cover
        this.mates.forEach((m) => {
          if (m.ch.pose !== 'cover' && m.ch.walkTo({ x: m.desk.cx, y: m.desk.cy }, dt, 120)) {
            m.ch.pose = 'cover';
            m.desk.occupied = true;
          }
        });
        if (this.teacher.pose !== 'drop' && this.teacher.walkTo({ x: 525, y: 420 }, dt, 110)) this.teacher.pose = 'drop';
        return;
      }
      if (this.state === 'aftershock') {
        people.forEach((ch) => { ch.pose = 'drop'; ch.moving = false; });
        return;
      }
      if (!this.evacuating) return;
      people.forEach((ch) => { if (ch.pose === 'drop' && this.state !== 'aftershock') ch.pose = 'stand'; });
      this.mates.concat([{ ch: this.teacher }]).forEach((m) => {
        const ch = m.ch;
        if (ch.delay > 0) {
          ch.delay -= dt;
          return;
        }
        if (ch.followPath(dt)) ch.facing = 'up';
      });
    }

    updateMarker() {
      const w = this.world;
      const p = this.player;
      if (this.state === 'shaking' && !this.covered) {
        const free = this.desks.filter((d) => !d.occupied && !d.nearWindow);
        free.sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y));
        w.marker = free[0] ? { x: free[0].cx, y: free[0].cy - 10 } : null;
      } else if (this.state === 'evacuate' || this.state === 'evacuate2') {
        if (w.inZone('classroom', p.x, p.y)) w.marker = { x: 568, y: 315 };
        else if (w.inZone('inside', p.x, p.y)) w.marker = { x: 650, y: 575 };
        else w.marker = { x: 540, y: 860 };
      } else {
        w.marker = null;
      }
    }

    updateEffects(dt) {
      const w = this.world;
      const s = this.state === 'shaking' ? 6 : this.state === 'aftershock' ? 3 : 0;
      w.shake += (s - w.shake) * Math.min(1, dt * 4);
      this.lights.forEach((l) => { l.swing = this.isShaking() ? 1 : Math.max(0, l.swing - dt * 0.3); });
      DR.Audio.ambient(s ? 'rumble' : null, s / 6);
      // a little dust falling from the ceiling
      if (this.state === 'shaking' && Math.random() < dt * 12) {
        w.emit({ x: DR.U.rand(60, 740), y: DR.U.rand(60, 520), vx: 0, vy: 40, life: 0.8, size: 2.5, color: 'rgba(190,180,160,0.8)', gravity: 60 });
      }
    }
  }

  DR.registerLevel({
    id: 'earthquake',
    number: 1,
    name: 'Earthquake',
    place: 'At school',
    color: '#e76f51',
    icon: 'firstaid',
    intro: 'Pack your kit at home, then head to school. Be ready — the ground could start shaking at any time!',
    briefing: 'You are in class. If the ground shakes: get under a sturdy desk and press Action to Drop, Cover and Hold On. Stay away from windows, shelves and hanging lights. When the shaking stops, walk to the assembly area.',
    kitExtras: { good: ['shoes'], bad: ['skateboard'] },
    Scene: EarthquakeScene
  });
})();
