/*
 * PREPARE PHASE — walk around the house and pack an emergency kit
 * before the timer runs out. Useful items give points; useless items
 * cost points and show a tip explaining why.
 *
 * The same house is used in every level. Each level adds one extra
 * useful item and one extra useless item (see kitExtras in the level files).
 */

/** Builds the family house. Returns places where items can appear. */
DR.buildHouse = function (world) {
  const P = DR.P;
  const add = (p) => world.add(p);

  world.bg = '#9ad46f';
  world.ground = (c) => {
    DR.G.floor(c, 'grass', 0, 0, world.w, world.h);
    DR.G.floor(c, 'tiles', 20, 20, 960, 600); // under the walls, so doorways have a floor
    DR.G.floor(c, 'kitchen', 36, 36, 384, 264);
    DR.G.floor(c, 'wood', 36, 316, 384, 288);
    DR.G.floor(c, 'wood', 436, 36, 528, 294);
    DR.G.floor(c, 'tiles', 436, 346, 528, 258);
    const tag = (s, x, y) => DR.G.label(c, s, x, y, { size: 13, color: 'rgba(61,58,75,0.35)', outline: 'rgba(255,255,255,0)' });
    tag('KITCHEN', 228, 286);
    tag('LIVING ROOM', 200, 380);
    tag('BEDROOM', 560, 316);
    tag('HALL', 700, 360);
  };

  // outer walls (front door gap at the bottom)
  add(P.wall(20, 20, 960, 16));
  add(P.wall(20, 604, 660, 16));
  add(P.wall(760, 604, 220, 16));
  add(P.wall(20, 20, 16, 600));
  add(P.wall(964, 20, 16, 600));
  // inner walls with doorways
  add(P.wall(420, 20, 16, 120));
  add(P.wall(420, 210, 16, 220));
  add(P.wall(420, 500, 16, 120));
  add(P.wall(20, 300, 160, 16));
  add(P.wall(260, 300, 160, 16));
  add(P.wall(436, 330, 204, 16));
  add(P.wall(720, 330, 244, 16));
  // windows
  add(P.window(110, 20, 90, 16));
  add(P.window(860, 20, 70, 16));
  add(P.window(20, 400, 16, 90));
  add(P.window(964, 400, 16, 90));
  add(P.window(160, 604, 110, 16));

  // kitchen
  add(P.counter(36, 36, 250, 46, { sink: 60, stove: 170 }));
  add(P.fridge(350, 36, 62, 58));
  add(P.table(130, 150, 130, 70, '#f4d35e'));
  add(P.chair(100, 175, '#ee964b'));
  add(P.chair(268, 175, '#ee964b'));
  add(P.plant(384, 262, 26));
  // living room
  add(P.rug(110, 400, 230, 120, 'rug'));
  add(P.tv(262, 318, 150, 30));
  add(P.table(160, 430, 100, 50, '#bc8a5f'));
  add(P.sofa(80, 532, 220, 58, '#6a4c93'));
  add(P.sofa(40, 380, 56, 66, '#4d908e'));
  // bedroom
  add(P.bed(810, 50, 140, 180, '#4361ee'));
  add(P.wardrobe(450, 38, 110, 52));
  add(P.table(640, 38, 120, 46, '#d4a373'));
  add(P.chair(690, 96, '#4cc9f0'));
  add(P.rug(580, 170, 180, 110));
  // hall
  add(P.bookshelf(922, 360, 40, 150));
  add(P.cabinet(450, 352, 90, 40));
  add(P.plant(880, 560, 30));
  add(P.mat(690, 576, 60, 26, '#b5838d'));
  const door = add(P.door(680, 604, 80, 16));

  return {
    start: { x: 700, y: 470 },
    door,
    spots: [
      [90, 112], [250, 108], [382, 122], [300, 252], [80, 240],
      [330, 374], [70, 474], [300, 470], [372, 574],
      [500, 140], [760, 262], [884, 280], [600, 300],
      [500, 452], [640, 420], [860, 452], [790, 540]
    ]
  };
};

DR.PrepareScene = class PrepareScene extends DR.Scene {
  constructor(game, level) {
    super(game);
    this.level = level;
    this.timeLeft = DR.CONFIG.PREPARE_SECONDS;
    this.lastWhole = Math.ceil(this.timeLeft);
    this.done = false;

    const world = (this.world = new DR.World(1000, 640));
    const house = DR.buildHouse(world);

    const good = DR.KIT_BASE.good.concat(level.kitExtras.good);
    const bad = DR.KIT_BASE.bad.concat(level.kitExtras.bad);
    this.goodTotal = good.length;
    this.found = [];
    this.wrong = [];

    // put items on random spots around the house
    const spots = DR.U.shuffle(house.spots);
    DR.U.shuffle(good.concat(bad)).forEach((id, i) => this.placeItem(id, spots[i][0], spots[i][1]));

    // leave early through the front door
    world.interact({
      x: 720, y: 590, r: 50, promptY: 50,
      label: 'Finish packing',
      use: () => this.finish()
    });

    const p = new DR.Character(house.start.x, house.start.y, 'student');
    world.setPlayer(p);
    game.tip('prep_start', 'info');
  }

  placeItem(id, x, y) {
    const item = DR.ITEMS[id];
    const prop = this.world.add({
      x: x - 16, y: y - 16, w: 32, h: 32, solid: false, layer: 'low',
      draw(c, t) {
        const bob = Math.sin(t * 3 + x) * 2;
        DR.G.ellipse(c, x, y + 10, 14, 5, 'rgba(40,30,70,0.18)');
        DR.G.circle(c, x, y - 4 + bob, 19, 'rgba(255,255,255,0.55)');
        DR.Icons.draw(c, id, x, y - 4 + bob, 28);
        // sparkle
        const s = (t * 1.5 + x * 0.01) % 2;
        if (s < 0.4) DR.G.circle(c, x + 12, y - 16 + bob, 3 * (0.4 - s) * 5, '#fff');
      }
    });
    const it = this.world.interact({
      x, y, r: 40, promptY: 44,
      itemId: id,
      label: 'Pick up ' + item.name,
      use: () => {
        this.world.remove(prop);
        this.world.removeInteract(it);
        this.pickUp(id, x, y);
      }
    });
  }

  pickUp(id, x, y) {
    const item = DR.ITEMS[id];
    const pts = DR.CONFIG.POINTS;
    if (item.good) {
      this.found.push(id);
      this.game.kit.push(id);
      this.game.addPoints(pts.goodItem, x, y - 30);
      this.game.tip(item.tip, 'good');
      DR.Audio.play('pickup');
      if (this.found.length === this.goodTotal) {
        this.game.tip('prep_full_kit', 'good');
        this.finish();
      }
    } else {
      this.wrong.push(id);
      this.game.addPoints(pts.uselessItem, x, y - 30);
      this.game.tip(item.tip, 'bad');
      DR.Audio.play('bad');
    }
  }

  update(dt) {
    super.update(dt);
    if (this.done) return;
    this.timeLeft -= dt;
    const whole = Math.ceil(this.timeLeft);
    if (whole !== this.lastWhole) {
      this.lastWhole = whole;
      if (whole === 10) this.game.tip('prep_time_low', 'bad');
      if (whole <= 10 && whole > 0) DR.Audio.play('tick');
    }
    if (DR.Input.consumeAction()) this.useFocus();
    this.world.updatePlayer(dt);
    this.finishUpdate(dt);

    this.objective = `Pack your emergency kit! Useful items found: ${this.found.length}/${this.goodTotal}`;
    this.timerText = DR.U.formatTime(this.timeLeft);
    if (this.timeLeft <= 0) this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const complete = this.found.length === this.goodTotal;
    let bonus = 0;
    if (complete) {
      bonus = DR.CONFIG.POINTS.fullKitBonus + Math.max(0, Math.floor(this.timeLeft)) * DR.CONFIG.POINTS.timeBonusPerSecond;
      this.game.addPoints(bonus);
    }
    const all = DR.KIT_BASE.good.concat(this.level.kitExtras.good);
    this.game.endPrepare({
      found: this.found.slice(),
      missing: all.filter((id) => !this.found.includes(id)),
      wrong: this.wrong.slice(),
      bonus,
      timeLeft: Math.max(0, Math.floor(this.timeLeft))
    });
  }
};
