/*
 * Keyboard and touch controls.
 *
 *  Move:    Arrow keys or WASD   (phone: on-screen joystick)
 *  Run:     Shift                (phone: RUN button)
 *  Action:  Space, E or Enter    (phone: hand button)
 *  Pause:   Esc or P
 *
 * The rest of the game only asks DR.Input simple questions such as
 * getMove() or consumeAction(), so it never cares which device is used.
 */
DR.Input = (function () {
  const keys = {};
  let actionQueued = false;
  let pauseQueued = false;
  const touch = { x: 0, y: 0, active: false, run: false };

  const ACTION_KEYS = ['Space', 'KeyE', 'Enter', 'NumpadEnter'];
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  const api = {
    /** Set by automated tests to steer the player: {x, y, run}. */
    bot: null,
    touchMode: false,

    /** Movement direction as {x, y}; length is between 0 and 1. */
    getMove() {
      if (api.bot) return { x: api.bot.x || 0, y: api.bot.y || 0 };
      let x = 0;
      let y = 0;
      if (keys.ArrowLeft || keys.KeyA) x -= 1;
      if (keys.ArrowRight || keys.KeyD) x += 1;
      if (keys.ArrowUp || keys.KeyW) y -= 1;
      if (keys.ArrowDown || keys.KeyS) y += 1;
      if (x || y) {
        const len = Math.hypot(x, y);
        return { x: x / len, y: y / len };
      }
      if (touch.active) return { x: touch.x, y: touch.y };
      return { x: 0, y: 0 };
    },

    isRunning() {
      if (api.bot) return !!api.bot.run;
      return !!(keys.ShiftLeft || keys.ShiftRight || touch.run);
    },

    /** True once for each press of the action button. */
    consumeAction() {
      const a = actionQueued;
      actionQueued = false;
      return a;
    },

    consumePause() {
      const p = pauseQueued;
      pauseQueued = false;
      return p;
    },

    /** Used by tests and on-screen buttons. */
    pressAction() {
      actionQueued = true;
    },

    /** Forget everything that is held (e.g. when a menu opens). */
    clear() {
      for (const k in keys) keys[k] = false;
      actionQueued = false;
      pauseQueued = false;
      touch.active = false;
      touch.x = touch.y = 0;
    },

    /** Connects the on-screen joystick and buttons (see index.html). */
    initTouch() {
      const joy = document.getElementById('joystick');
      const knob = document.getElementById('joy-knob');
      const btnAction = document.getElementById('btn-action');
      const btnRun = document.getElementById('btn-run');
      let pointerId = null;

      const moveKnob = (e) => {
        const r = joy.getBoundingClientRect();
        const radius = r.width / 2;
        let dx = (e.clientX - (r.left + radius)) / radius;
        let dy = (e.clientY - (r.top + radius)) / radius;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        const dead = Math.hypot(dx, dy) < 0.18;
        touch.x = dead ? 0 : dx;
        touch.y = dead ? 0 : dy;
        touch.active = true;
        // knob offset is in the unscaled UI units (joystick is 130 units wide)
        knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
      };
      const release = () => {
        pointerId = null;
        touch.active = false;
        touch.x = touch.y = 0;
        knob.style.transform = '';
      };

      joy.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pointerId = e.pointerId;
        try {
          joy.setPointerCapture(e.pointerId);
        } catch (err) {
          /* some browsers refuse capture; dragging still works inside the joystick */
        }
        moveKnob(e);
      });
      joy.addEventListener('pointermove', (e) => {
        if (e.pointerId === pointerId) moveKnob(e);
      });
      joy.addEventListener('pointerup', release);
      joy.addEventListener('pointercancel', release);

      btnAction.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        actionQueued = true;
        btnAction.classList.add('down');
      });
      const actionUp = () => btnAction.classList.remove('down');
      btnAction.addEventListener('pointerup', actionUp);
      btnAction.addEventListener('pointerleave', actionUp);

      btnRun.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        touch.run = !touch.run; // tap to switch running on/off
        btnRun.classList.toggle('on', touch.run);
      });

      // Show touch controls as soon as someone touches the screen.
      window.addEventListener('touchstart', () => api.setTouchMode(true), { passive: true });
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) api.setTouchMode(true);
    },

    setTouchMode(on) {
      if (api.touchMode === on) return;
      api.touchMode = on;
      document.body.classList.toggle('touch', on);
    }
  };

  window.addEventListener('keydown', (e) => {
    const playing = DR.Game && DR.Game.state === 'play';
    if (playing && GAME_KEYS.includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (playing && ACTION_KEYS.includes(e.code)) actionQueued = true;
    if (e.code === 'Escape' || e.code === 'KeyP') pauseQueued = true;
    if (!api.bot) api.setTouchMode(false);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  return api;
})();
