/*
 * The game manager: runs the main loop and moves between screens.
 *
 *   title → level intro → PREPARE → kit check → DISASTER → level complete
 *         → quiz → results → next level … → end screen
 *
 * Level scenes talk to the game with:
 *   game.tip(idOrText, kind)          show a safety tip
 *   game.addPoints(n, x, y, label)    change the score (label = shown in the summary)
 *   game.hurt(amount, tipId)          lose health
 *   game.hasItem(id)                  is this item in the kit?
 *   game.radio(text)                  show a radio/phone message
 *   game.completeLevel()              the disaster phase is won
 */
DR.Game = {
  state: 'title',        // 'title' | 'overlay' | 'play' | 'paused'
  scene: null,
  phase: null,           // 'prepare' | 'disaster'
  levelIndex: 0,
  runStart: 0,
  score: 0,
  levelStartScore: 0,
  health: 100,
  kit: [],
  log: [],
  time: 0,
  lastTip: '',
  manualClock: false,    // tests drive the game with tick() instead of the real clock

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    DR.HUD.init();
    DR.Screens.init();
    DR.Input.initTouch();

    document.getElementById('btn-pause').addEventListener('click', () => this.pause());
    document.getElementById('btn-sound').addEventListener('click', () => {
      DR.Audio.unlock();
      DR.Audio.toggle();
      this.refreshSoundButton();
    });
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });

    this.manualClock = /[?&]test\b/.test(location.search);
    this.resize();
    this.refreshSoundButton();
    DR.Screens.title(this);

    if (!this.manualClock) {
      let last = performance.now();
      let acc = 0;
      const STEP = 1 / 60;
      const loop = (now) => {
        acc += Math.min(0.1, (now - last) / 1000);
        last = now;
        while (acc >= STEP) {
          this.tick(STEP);
          acc -= STEP;
        }
        this.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } else {
      this.render();
    }
  },

  /** Fits the game to the window, keeping the 16:9 shape. */
  resize() {
    const W = DR.CONFIG.WIDTH;
    const H = DR.CONFIG.HEIGHT;
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    const stage = document.getElementById('stage');
    stage.style.width = Math.floor(W * s) + 'px';
    stage.style.height = Math.floor(H * s) + 'px';
    document.documentElement.style.setProperty('--s', s);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(W * s * dpr);
    this.canvas.height = Math.floor(H * s * dpr);
    this.ctx.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    if (this.manualClock) this.render();
  },

  setState(s) {
    this.state = s;
    document.body.classList.toggle('playing', s === 'play');
  },

  // ---------- Main loop ----------
  tick(dt) {
    this.time += dt;
    if (this.state === 'play') {
      if (DR.Input.consumePause()) {
        this.pause();
        return;
      }
      this.scene.update(dt);
      if (this.state === 'play') {
        DR.HUD.update(this);
        if (this.health <= 0) this.failLevel();
      }
    } else if (this.state === 'paused') {
      if (DR.Input.consumePause()) this.resume();
    } else {
      DR.Input.consumePause();
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.scene) this.scene.draw(ctx);
    else DR.Screens.drawBackdrop(ctx, this.time);
    ctx.restore();
  },

  level() {
    return DR.LEVELS[this.levelIndex];
  },

  // ---------- Moving between screens ----------
  startRun(index) {
    this.score = 0;
    this.runStart = index;
    this.startLevel(index);
  },

  startLevel(index) {
    this.levelIndex = index;
    this.levelStartScore = this.score;
    this.clearScene();
    this.setState('overlay');
    DR.HUD.show(false);
    const lv = this.level();
    DR.Screens.levelIntro(this, lv, DR.U.pick(DR.FACTS[lv.id]));
  },

  beginPrepare() {
    this.health = DR.CONFIG.MAX_HEALTH;
    this.kit = [];
    this.log = [];
    this.firstAidUsed = false;
    this.score = this.levelStartScore;
    this.phase = 'prepare';
    this.setScene(new DR.PrepareScene(this, this.level()));
  },

  /** Called by the prepare scene when packing is over. */
  endPrepare(summary) {
    const P = DR.CONFIG.POINTS;
    const total = summary.found.length + summary.missing.length;
    this.log.push({ label: `Packed ${summary.found.length}/${total} useful kit items`, n: summary.found.length * P.goodItem });
    if (summary.wrong.length) this.log.push({ label: `Picked up ${summary.wrong.length} useless item(s)`, n: summary.wrong.length * P.uselessItem });
    if (summary.bonus) this.log.push({ label: 'Complete kit + time bonus', n: summary.bonus });
    this.setState('overlay');
    DR.HUD.show(false);
    DR.Audio.ambient(null);
    DR.Screens.kitSummary(this, this.level(), summary);
  },

  beginDisaster() {
    this.phase = 'disaster';
    this.setScene(new (this.level().Scene)(this));
  },

  setScene(scene) {
    if (this.scene) this.scene.destroy();
    DR.HUD.reset();
    this.scene = scene;
    DR.Screens.hide();
    DR.HUD.show(true);
    DR.HUD.update(this);
    this.play();
  },

  play() {
    this.setState('play');
    DR.Input.clear();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  /** The disaster phase was won. */
  completeLevel() {
    if (this.state !== 'play') return;
    this.setState('overlay');
    const hp = Math.max(0, Math.round(this.health));
    this.addPoints(hp * DR.CONFIG.POINTS.healthBonusPerPoint, null, null, `Health bonus (${hp} health left)`);
    this.scene.destroy();
    DR.HUD.show(false);
    DR.Screens.levelComplete(this, this.level(), this.log, this.score - this.levelStartScore);
  },

  startQuiz() {
    const lv = this.level();
    const questions = DR.U.shuffle(DR.QUIZZES[lv.id]).slice(0, 3);
    DR.Screens.quiz(lv, questions, (correct) => this.finishQuiz(correct, questions.length));
  },

  finishQuiz(correct, total) {
    const lv = this.level();
    const bonus = correct * DR.CONFIG.POINTS.quizCorrect;
    this.score += bonus;
    const levelScore = this.score - this.levelStartScore;

    // unlock the next level and remember the best score
    const unlocked = DR.Store.get('unlocked', 1);
    const newUnlocked = Math.min(DR.LEVELS.length, Math.max(unlocked, this.levelIndex + 2));
    DR.Store.set('unlocked', newUnlocked);
    const best = DR.Store.get('best', {});
    best[lv.id] = Math.max(best[lv.id] || 0, levelScore);
    DR.Store.set('best', best);

    if (correct === total) DR.Audio.play('win');
    DR.Screens.levelResult(this, lv, {
      correct, total, bonus, levelScore,
      total_score: this.score,
      hasNext: this.levelIndex + 1 < DR.LEVELS.length,
      unlockedNew: newUnlocked > unlocked
    });
  },

  nextLevel() {
    if (this.levelIndex + 1 < DR.LEVELS.length) this.startLevel(this.levelIndex + 1);
    else this.endRun();
  },

  endRun() {
    this.clearScene();
    this.setState('overlay');
    const played = DR.LEVELS.length - this.runStart;
    const avg = this.score / played;
    let rankIndex = 0;
    DR.CONFIG.RANKS.forEach((r, i) => { if (avg >= r.min) rankIndex = i; });
    const high = DR.Store.get('highScore', 0);
    const isNew = this.score > high;
    if (isNew) DR.Store.set('highScore', this.score);
    DR.Audio.play('win');
    DR.Screens.end(this, { score: this.score, rank: DR.CONFIG.RANKS[rankIndex].name, rankIndex, high: Math.max(high, this.score), isNew });
  },

  failLevel() {
    this.setState('overlay');
    this.scene.destroy();
    DR.HUD.show(false);
    DR.Audio.play('lose');
    DR.Screens.fail(this, this.level(), this.lastTip);
  },

  restartLevel() {
    this.score = this.levelStartScore;
    this.clearScene();
    this.beginPrepare();
  },

  pause() {
    if (this.state !== 'play') return;
    this.setState('paused');
    DR.Audio.ambient(null);
    DR.Screens.pause(this);
  },

  resume() {
    DR.Screens.hide();
    this.play();
  },

  quitToMenu() {
    this.clearScene();
    DR.HUD.show(false);
    this.setState('title');
    DR.Screens.title(this);
  },

  clearScene() {
    if (this.scene) this.scene.destroy();
    this.scene = null;
  },

  refreshSoundButton() {
    document.getElementById('btn-sound').classList.toggle('off', !DR.Audio.isOn());
  },

  // ---------- Used by level scenes ----------
  tip(idOrText, kind) {
    return DR.HUD.toast(DR.TIPS[idOrText] || idOrText, kind);
  },

  radio(text) {
    DR.HUD.radio(text);
    DR.Audio.play('radio');
  },

  addPoints(n, x, y, label) {
    if (!n) return;
    this.score += n;
    if (label) this.log.push({ label, n });
    if (x !== null && x !== undefined && this.scene && this.scene.world) {
      this.scene.world.float((n > 0 ? '+' : '') + n, x, y, n < 0 ? '#e63946' : '#2a9d8f');
    }
  },

  hurt(amount, tipId) {
    if (amount <= 0 || this.state !== 'play') return;
    this.health -= amount;
    if (tipId) this.tip(tipId, 'bad');
    if (this.time - (this.lastHurtFx || 0) > 0.6) {
      this.lastHurtFx = this.time;
      DR.HUD.hurtFlash();
      DR.Audio.play('hurt');
    }
    // the first aid kit patches you up once when health gets low
    if (this.health < 35 && this.health > 0 && this.hasItem('firstaid') && !this.firstAidUsed) {
      this.firstAidUsed = true;
      this.health += 30;
      this.tip('first_aid_used', 'good');
    }
  },

  hasItem(id) {
    return this.kit.includes(id);
  }
};
