/*
 * The HUD (heads-up display): score, health, timer, kit items, meters,
 * the objective banner, safety tip pop-ups and the radio panel.
 */
DR.HUD = (function () {
  const $ = (id) => document.getElementById(id);
  let els = null;
  const last = {};               // last values, so we only touch the page when something changes
  const recentTips = {};         // tip text -> time last shown
  let radioTimer = null;

  function init() {
    els = {
      hud: $('hud'), level: $('hud-level'), phase: $('hud-phase'), score: $('hud-score'),
      health: $('hud-health'), healthText: $('hud-health-text'), timer: $('hud-timer'),
      kitCount: $('hud-kit-count'), kitIcons: $('hud-kit-icons'), meters: $('hud-meters'),
      objective: $('objective'), toasts: $('toasts'), radio: $('radio'), radioText: $('radio-text'),
      vignette: $('vignette')
    };
    els.radio.addEventListener('click', hideRadio);
  }

  function set(key, value, fn) {
    if (last[key] !== value) {
      last[key] = value;
      fn(value);
    }
  }

  function show(on) {
    els.hud.classList.toggle('hidden', !on);
    els.objective.classList.toggle('hidden', !on);
    if (!on) {
      hideRadio();
      els.toasts.innerHTML = '';
    }
  }

  /** Called every frame while playing. */
  function update(game) {
    const scene = game.scene;
    const level = game.level();
    set('level', `${level.number}. ${level.name}`, (v) => { els.level.textContent = v; });
    set('phase', game.phase === 'prepare' ? 'Prepare' : 'Disaster!', (v) => {
      els.phase.textContent = v;
      els.phase.className = game.phase === 'prepare' ? 'phase-prep' : 'phase-disaster';
    });
    set('score', game.score, (v) => { els.score.textContent = v; });
    const hp = Math.max(0, Math.round(game.health));
    set('health', hp, (v) => {
      els.health.style.width = v + '%';
      els.health.style.background = v > 60 ? '#06d6a0' : v > 30 ? '#ffd166' : '#ef476f';
      els.healthText.textContent = v;
    });
    set('timer', scene.timerText, (v) => { els.timer.textContent = v; });
    set('objective', scene.objective, (v) => { els.objective.textContent = v; els.objective.classList.toggle('empty', !v); });

    const total = DR.KIT_BASE.good.length + level.kitExtras.good.length;
    set('kitCount', game.kit.length + '/' + total, (v) => { els.kitCount.textContent = v; });
    set('kitIcons', game.kit.join(','), () => {
      els.kitIcons.innerHTML = game.kit.map((id) => `<img src="${DR.Icons.url(id, 40)}" alt="${DR.U.esc(DR.ITEMS[id].name)}" title="${DR.U.esc(DR.ITEMS[id].name)}">`).join('');
    });

    const meters = scene.meters || [];
    set('meterNames', meters.map((m) => m.label).join(','), () => {
      els.meters.innerHTML = meters.map((m, i) => `<div class="meter"><span>${DR.U.esc(m.label)}</span><div class="bar"><i id="meter-${i}"></i></div></div>`).join('');
    });
    meters.forEach((m, i) => {
      set('meter' + i, Math.round(m.value * 100) + m.color, () => {
        const bar = $('meter-' + i);
        bar.style.width = Math.round(DR.U.clamp(m.value, 0, 1) * 100) + '%';
        bar.style.background = m.color;
      });
    });
  }

  /**
   * Shows a safety tip. kind: 'good' (green), 'bad' (red) or 'info' (blue).
   * The same tip is not repeated within a few seconds.
   */
  function toast(text, kind = 'info') {
    const now = performance.now();
    if (recentTips[text] && now - recentTips[text] < 7000) return false;
    recentTips[text] = now;
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    const badge = { good: '✓', bad: '!', info: 'i' }[kind] || 'i';
    el.innerHTML = `<span class="badge">${badge}</span><span>${DR.U.esc(text)}</span>`;
    els.toasts.appendChild(el);
    while (els.toasts.children.length > 2) els.toasts.removeChild(els.toasts.firstChild);
    const ms = 3500 + text.length * 35;
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
    if (DR.Game) DR.Game.lastTip = text;
    return true;
  }

  /** Radio / phone message panel. Click to close. */
  function radio(text) {
    els.radioText.textContent = text;
    els.radio.classList.remove('hidden');
    clearTimeout(radioTimer);
    radioTimer = setTimeout(hideRadio, 5000 + text.length * 45);
  }

  function hideRadio() {
    clearTimeout(radioTimer);
    els.radio.classList.add('hidden');
  }

  function hurtFlash() {
    els.vignette.classList.remove('flash');
    void els.vignette.offsetWidth; // restart the CSS animation
    els.vignette.classList.add('flash');
  }

  function reset() {
    for (const k in last) delete last[k];
    for (const k in recentTips) delete recentTips[k];
    els.toasts.innerHTML = '';
    hideRadio();
  }

  return { init, show, update, toast, radio, hideRadio, hurtFlash, reset };
})();
