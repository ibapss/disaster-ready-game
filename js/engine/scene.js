/*
 * Base class for a playable phase (the prepare phase and each disaster).
 *
 * A scene must create `this.world` and can set:
 *   this.objective  — text shown at the top of the screen
 *   this.timerText  — text for the HUD timer
 *   this.meters     — extra HUD bars: [{ label, value (0..1), color }]
 */
DR.Scene = class Scene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.objective = '';
    this.timerText = '';
    this.meters = [];
    this.world = null;
  }

  update(dt) {
    this.t += dt;
  }

  /** Uses whatever the player is standing next to. Returns true if something was used. */
  useFocus() {
    this.world.updateFocus();
    const it = this.world.focus;
    if (it && (!this.world.player.locked || it.whileLocked)) {
      it.use();
      this.world.focus = null;
      return true;
    }
    return false;
  }

  /** Moves the camera and updates floating texts/particles. */
  finishUpdate(dt) {
    this.world.updateCamera(dt);
    this.world.updateEffects(dt);
  }

  draw(ctx) {
    this.world.draw(ctx, this.t);
    this.drawOverlay(ctx);
    this.world.drawUI(ctx, this.t);
  }

  /** Screen-space effects (darkness, heat haze, rain…). Override in levels. */
  drawOverlay() {}

  /** Called when the scene ends: stop looping sounds. */
  destroy() {
    DR.Audio.ambient(null);
  }
};
