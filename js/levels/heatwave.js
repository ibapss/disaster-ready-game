/*
 * LEVEL 3 — HEATWAVE in the market.
 *
 *  - The HEAT meter rises in direct sun and falls in the shade.
 *  - The WATER meter (how hydrated you are) drops over time: drink at taps.
 *  - Running in the midday sun makes you heat up much faster.
 *  - Help a shopper with heatstroke signs: lead them into the shade,
 *    call for help, then cool them with a wet cloth until the medics arrive.
 */
(function () {
  const P = DR.P;
  const G = DR.G;

  // Heat rules (per second)
  const HEAT_SUN = 2.8;           // heat gained in the sun
  const HEAT_RUNNING = 7;         // extra heat when running in the sun
  const HEAT_THIRSTY = 2;         // extra heat when you are dehydrated
  const COOL_SHADE = 9;           // heat lost in the shade
  const THIRST_SUN = 1.0;         // water lost in the sun
  const THIRST_SHADE = 0.5;       // water lost in the shade
  const OVERHEAT_DAMAGE = 8;      // health lost per second at full heat

  const STALLS = [[100, 100, '#e63946'], [290, 100, '#f77f00'], [480, 100, '#2a9d8f'], [670, 100, '#7209b7'], [100, 420, '#f77f00'], [290, 420, '#e63946']];
  const TREES = [[920, 230], [1080, 420], [770, 720], [470, 740]];
  const UMBRELLAS = [[620, 420], [300, 650]];
  const TAPS = [[440, 330], [1000, 560], [230, 820], [1320, 330]];

  class HeatwaveScene extends DR.Scene {
    constructor(game) {
      super(game);
      this.heat = 10;
      this.water = game.hasItem('water') ? 100 : 60;
      this.quest = 'find';         // find → escort → call → cloth → cool → wait → done
      this.hasCloth = false;
      this.drinks = 0;
      this.build();
      game.tip('hw_start', 'info');
      if (game.hasItem('hat')) game.tip('Your sun hat from the kit helps keep you cooler!', 'good');
      if (game.hasItem('water')) game.tip('Your water bottles from the kit keep you hydrated at the start.', 'good');
    }

    build() {
      const w = (this.world = new DR.World(1500, 1000));
      const add = (p) => w.add(p);
      w.bg = '#efdcb8';
      w.ground = (c) => {
        G.floor(c, 'paving', 0, 0, w.w, w.h);
        G.floor(c, 'road', 0, 900, w.w, 100);
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([24, 20]);
        c.beginPath(); c.moveTo(0, 950); c.lineTo(w.w, 950); c.stroke(); c.setLineDash([]);
        G.floor(c, 'grass', 1040, 0, 460, 120);
        G.floor(c, 'grass', 0, 600, 120, 300);
      };
      w.afterFloor = (c) => this.drawShade(c);

      STALLS.forEach(([x, y, col]) => {
        add(P.stall(x, y, col));
        w.zone('shade', { x: x - 4, y: y + 60, w: 138, h: 46 });
      });
      TREES.forEach(([x, y]) => {
        add(P.tree(x, y, 36, '#40916c'));
        w.zone('shade', { cx: x, cy: y - 28, r: 50 });
      });
      UMBRELLAS.forEach(([x, y]) => {
        add(this.umbrella(x, y));
        w.zone('shade', { cx: x, cy: y, r: 48 });
      });
      add(P.pavilion(1080, 600, 320, 220));
      w.zone('shade', { x: 1070, y: 575, w: 340, h: 240 });
      add(P.bench(1130, 660, 80, 22));
      add(P.bench(1270, 740, 80, 22));

      this.taps = TAPS.map(([x, y]) => {
        add(P.tap(x, y));
        const tap = { x, y, cool: 0 };
        w.interact({
          x, y: y + 16, r: 48, promptY: 60,
          get label() { return tap.wet ? 'Drink & wet the cloth' : 'Drink water'; },
          use: () => this.useTap(tap)
        });
        return tap;
      });

      add(P.sign(70, 880, 'Market', '#e76f51'));
      add(P.car(200, 912, '#4cc9f0'));
      add(P.flowers(40, 640));
      add(P.flowers(1100, 40));
      [[880, 100], [960, 60]].forEach(([x, y]) => add(P.bush(x, y, 18)));

      // people
      this.player = new DR.Character(620, 840, 'student', { facing: 'up' });
      w.setPlayer(this.player);
      w.addCharacter(new DR.Character(165, 190, 'vendor', { facing: 'down' }));
      w.addCharacter(new DR.Character(545, 190, 'vendor2', { facing: 'down' }));
      w.addCharacter(new DR.Character(355, 510, 'vendor', { facing: 'down' }));

      const npc = (this.npc = w.addCharacter(new DR.Character(1250, 230, 'shopper', { facing: 'left', speed: 90, name: 'the shopper' })));
      npc.mood = 'dizzy';
      npc.bubble = '?';
      w.interact({
        x: npc.x, y: npc.y, r: 52, follow: npc,
        get label() {
          return { find: 'Help the dizzy shopper', call: 'Call emergency services', cool: 'Cool them with the wet cloth' }[this.scene.quest] || '';
        },
        scene: this,
        enabled: () => this.quest === 'find' || this.quest === 'call' || (this.quest === 'cool' && this.hasCloth),
        use: () => this.helpNPC()
      });

      this.ambulance = P.ambulance(1600, 905); // added to the world when called
    }

    /** Market umbrella giving a round patch of shade. */
    umbrella(x, y) {
      return {
        x: x - 6, y: y - 6, w: 12, h: 12, solid: true, layer: 'low',
        draw(c) {
          G.box(c, x - 18, y - 8, 36, 22, { fill: '#ffffff', r: 10 });
        },
        drawHigh(c, t, world) {
          const p = world.player;
          const under = Math.hypot(p.x - x, p.y - y) < 50;
          c.save();
          if (under) c.globalAlpha = 0.45;
          for (let i = 0; i < 8; i++) {
            c.fillStyle = i % 2 ? '#ffffff' : '#00b4d8';
            c.beginPath(); c.moveTo(x, y - 40); c.arc(x, y - 40, 50, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4); c.fill();
          }
          G.circle(c, x, y - 40, 50, null, G.OUTLINE, 2);
          G.circle(c, x, y - 40, 5, '#ffd166', G.OUTLINE, 1.5);
          c.restore();
        }
      };
    }

    useTap(tap) {
      this.water = 100;
      this.heat = Math.max(0, this.heat - 25);
      DR.Audio.play('splash');
      if (this.quest === 'cloth') {
        this.hasCloth = true;
        this.quest = 'cool';
        this.game.tip('hw_wet_cloth', 'good');
        this.game.addPoints(50, tap.x, tap.y - 50, 'Wet a cloth to cool the patient');
        return;
      }
      if (tap.cool <= 0 && this.drinks < 4) {
        this.drinks++;
        this.game.addPoints(20, tap.x, tap.y - 50, 'Drank water');
      }
      tap.cool = 6;
      this.game.tip('hw_drink', 'good');
    }

    helpNPC() {
      const npc = this.npc;
      if (this.quest === 'find') {
        this.quest = 'escort';
        npc.bubble = null;
        this.world.followers.push(npc);
        this.game.tip('hw_signs', 'info');
        this.game.addPoints(100, npc.x, npc.y - 60, 'Noticed heatstroke signs');
        DR.Audio.play('good');
      } else if (this.quest === 'call') {
        this.quest = 'cloth';
        DR.Audio.play('radio');
        this.game.radio('You called emergency services: "Someone at the market is confused and dizzy in the heat." — "An ambulance is on the way. Keep them in the shade and cool them with water."');
        this.game.tip('hw_called', 'good');
        if (this.game.hasItem('powerbank')) this.game.tip('Your power bank kept your phone charged to make that call!', 'good');
        this.game.addPoints(150, npc.x, npc.y - 60, 'Called for help');
      } else if (this.quest === 'cool') {
        this.quest = 'wait';
        this.hasCloth = false;
        npc.mood = null;
        this.game.tip('hw_cooled', 'good');
        this.game.tip('hw_no_drink', 'info');
        this.game.addPoints(150, npc.x, npc.y - 60, 'Cooled them down');
        DR.Audio.play('good');
        this.world.add(this.ambulance);
        this.ambulanceT = 0;
      }
    }

    update(dt) {
      super.update(dt);
      const w = this.world;
      const p = this.player;

      if (DR.Input.consumeAction()) this.useFocus();
      w.updatePlayer(dt, { speedMult: this.quest === 'escort' ? 0.8 : 1 });

      // ----- heat and water -----
      const inShade = w.inZone('shade', p.x, p.y);
      const hat = this.game.hasItem('hat') ? 0.75 : 1;
      if (inShade) {
        this.heat -= COOL_SHADE * dt;
        this.water -= THIRST_SHADE * dt;
      } else {
        let gain = HEAT_SUN + (p.running ? HEAT_RUNNING : 0) + (this.water < 25 ? HEAT_THIRSTY : 0);
        this.heat += gain * hat * dt;
        this.water -= (THIRST_SUN + (p.running ? 1 : 0)) * dt;
        if (p.running) this.game.tip('hw_running', 'bad');
      }
      this.heat = DR.U.clamp(this.heat, 0, 100);
      this.water = DR.U.clamp(this.water, 0, 100);
      if (this.heat >= 100) this.game.hurt(OVERHEAT_DAMAGE * dt, 'hw_hot');
      else if (this.heat > 70) this.game.tip('hw_hot', 'bad');
      if (this.water < 25) this.game.tip('hw_thirsty', 'bad');
      if (this.water <= 0) this.game.hurt(3 * dt, 'hw_thirsty');
      this.taps.forEach((tp) => { tp.cool -= dt; tp.wet = this.quest === 'cloth'; });

      // ----- helping the shopper -----
      const npc = this.npc;
      if (this.quest === 'escort' && w.inZone('shade', npc.x, npc.y) && w.inZone('shade', p.x, p.y)) {
        this.quest = 'call';
        w.followers = w.followers.filter((f) => f !== npc);
        npc.pose = 'sit';
        npc.moving = false;
        this.game.tip('hw_in_shade', 'good');
        this.game.addPoints(150, npc.x, npc.y - 60, 'Moved them into the shade');
        DR.Audio.play('good');
      }
      if (this.quest === 'wait') this.updateAmbulance(dt);

      // ----- objective and marker -----
      const nearestTap = this.taps.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      const texts = {
        find: 'Someone at the market looks unwell. Find them!',
        escort: 'Lead them slowly into the SHADE (awnings, trees or the rest area).',
        call: 'Call for help: use Action next to them.',
        cloth: 'Wet a cloth at a water tap to cool them down.',
        cool: 'Bring the wet cloth back and cool them down.',
        wait: 'Stay in the shade with them until the medics arrive.',
        done: 'The medics are here!'
      };
      this.objective = texts[this.quest];
      if (this.quest === 'cloth') w.marker = { x: nearestTap.x, y: nearestTap.y - 10 };
      else if (this.quest === 'escort') w.marker = { x: 1240, y: 680 };
      else if (this.quest === 'wait' || this.quest === 'done') w.marker = null;
      else w.marker = { x: npc.x, y: npc.y - 30 };
      if (this.heat > 70 && this.quest !== 'cloth') w.marker = null;

      const minutes = 11 * 60 + 50 + Math.floor(this.t / 1.5);
      this.timerText = Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0');
      this.meters = [
        { label: 'Heat', value: this.heat / 100, color: this.heat > 70 ? '#e63946' : '#f77f00' },
        { label: 'Water', value: this.water / 100, color: '#4cc9f0' }
      ];
      DR.Audio.ambient(null);
      this.finishUpdate(dt);
    }

    updateAmbulance(dt) {
      const a = this.ambulance;
      this.ambulanceT += dt;
      const stopX = DR.U.clamp(this.npc.x - 40, 100, 1350);
      if (a.x > stopX) {
        a.x -= 220 * dt;
        if (Math.floor(this.ambulanceT * 2) !== Math.floor((this.ambulanceT - dt) * 2)) DR.Audio.play('tick');
      } else if (!this.arrived) {
        this.arrived = true;
        this.arrivedT = 0;
        this.game.tip('hw_medics', 'good');
        DR.Audio.play('win');
        this.medic = this.world.addCharacter(new DR.Character(a.x + 50, a.y - 10, 'medic', { speed: 100 }));
      }
      if (this.arrived) {
        this.arrivedT += dt;
        this.medic.walkTo({ x: this.npc.x + 30, y: this.npc.y + 6 }, dt);
        if (this.arrivedT > 3 && this.quest !== 'done') {
          this.quest = 'done';
          this.game.completeLevel();
        }
      }
    }

    drawShade(c) {
      c.fillStyle = 'rgba(40, 50, 90, 0.2)';
      (this.world.zones.shade || []).forEach((s) => {
        if (s.r !== undefined) {
          c.beginPath(); c.ellipse(s.cx, s.cy, s.r, s.r * 0.8, 0, 0, Math.PI * 2); c.fill();
        } else {
          G.rr(c, s.x, s.y, s.w, s.h, 14); c.fill();
        }
      });
    }

    drawOverlay(c) {
      // warm sunny tint that gets stronger as you heat up
      c.fillStyle = `rgba(255, 160, 40, ${0.06 + (this.heat / 100) * 0.16})`;
      c.fillRect(0, 0, DR.CONFIG.WIDTH, DR.CONFIG.HEIGHT);
      // heat shimmer lines
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const x = (i * 173) % DR.CONFIG.WIDTH;
        const y = DR.CONFIG.HEIGHT - ((this.t * 40 + i * 97) % DR.CONFIG.HEIGHT);
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(x + 6, y - 8, x - 6, y - 16, x, y - 24);
        c.stroke();
      }
      // a red glow at the edges when you overheat
      if (this.heat > 70) {
        const a = ((this.heat - 70) / 30) * 0.35 * (0.7 + Math.sin(this.t * 6) * 0.3);
        const g = c.createRadialGradient(480, 270, 200, 480, 270, 560);
        g.addColorStop(0, 'rgba(230,57,70,0)');
        g.addColorStop(1, `rgba(230,57,70,${a})`);
        c.fillStyle = g;
        c.fillRect(0, 0, DR.CONFIG.WIDTH, DR.CONFIG.HEIGHT);
      }
    }
  }

  DR.registerLevel({
    id: 'heatwave',
    number: 3,
    name: 'Heatwave',
    place: 'At the market',
    color: '#f77f00',
    icon: 'hat',
    intro: 'It is going to be a scorching hot day. Pack your kit before heading to the market.',
    briefing: 'A heatwave! Watch your HEAT and WATER meters. Stay in the shade, drink at the water taps, and don\'t run in the midday sun. Someone at the market is dizzy and confused — help them into the shade and call for help.',
    kitExtras: { good: ['hat'], bad: ['fizzy'] },
    Scene: HeatwaveScene
  });
})();
