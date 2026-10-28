/*
 * Menu screens: title, how to play, level select, level intro ("Did you know?"),
 * kit check, pause, level complete, quiz, results, game over and the end screen.
 *
 * Each screen is plain HTML put into the #overlay element. Buttons use
 * data-act="name" and the matching function in `actions` runs on click.
 */
DR.Screens = (function () {
  const esc = DR.U.esc;
  let overlay = null;
  let actions = {};

  const LOGO = `
    <svg class="logo-icon" viewBox="0 0 100 110" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ec4b6"/><stop offset="1" stop-color="#1b8a7f"/></linearGradient></defs>
      <path d="M50 4 L92 18 V52 C92 80 72 98 50 106 C28 98 8 80 8 52 V18 Z" fill="url(#lg)" stroke="#3d3a4b" stroke-width="5" stroke-linejoin="round"/>
      <path d="M28 58 L50 38 L72 58 V80 H28 Z" fill="#fff" stroke="#3d3a4b" stroke-width="4" stroke-linejoin="round"/>
      <rect x="44" y="64" width="12" height="16" fill="#f4a261" stroke="#3d3a4b" stroke-width="3"/>
      <path d="M50 22 C46 16 36 18 38 26 C40 31 50 36 50 36 C50 36 60 31 62 26 C64 18 54 16 50 22 Z" fill="#ef476f" stroke="#3d3a4b" stroke-width="3"/>
    </svg>`;

  function init() {
    overlay = document.getElementById('overlay');
    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      DR.Audio.unlock();
      DR.Audio.play('click');
      const fn = actions[btn.dataset.act];
      if (fn) fn(btn.dataset.arg);
    });
  }

  /** Shows a screen. `acts` maps button names to functions. */
  function show(html, acts, cls) {
    actions = acts || {};
    overlay.className = 'overlay ' + (cls || '');
    overlay.innerHTML = html;
    overlay.scrollTop = 0;
    const first = overlay.querySelector('[autofocus]') || overlay.querySelector('button.primary');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }

  function hide() {
    overlay.className = 'overlay hidden';
    overlay.innerHTML = '';
    actions = {};
  }

  const soundLabel = () => (DR.Audio.isOn() ? 'Sound: On' : 'Sound: Off');
  const icon = (id, px = 40) => `<img class="icon" src="${DR.Icons.url(id, px * 2)}" width="${px}" height="${px}" alt="">`;

  function levelBadge(level) {
    return `<span class="lvl-badge" style="background:${level.color}">Level ${level.number}</span>`;
  }

  // ---------------- Screens ----------------
  function title(g) {
    const high = DR.Store.get('highScore', 0);
    show(`
      <div class="title-screen">
        <div class="logo">${LOGO}<div><h1>Disaster <span>Ready</span></h1>
        <p class="tagline">Learn what to do before, during and after natural disasters!</p></div></div>
        <div class="menu">
          <button class="btn primary big" data-act="play" autofocus>Play</button>
          <button class="btn" data-act="levels">Choose level</button>
          <button class="btn" data-act="howto">How to play</button>
          <button class="btn ghost" data-act="sound">${soundLabel()}</button>
        </div>
        ${high ? `<p class="high">High score: <b>${high}</b></p>` : ''}
      </div>`, {
      play: () => g.startRun(0),
      levels: () => levelSelect(g),
      howto: () => howTo(() => title(g)),
      sound: () => { DR.Audio.toggle(); g.refreshSoundButton(); title(g); }
    }, 'menu-bg');
  }

  function howTo(back) {
    show(`
      <div class="card wide">
        <h2>How to play</h2>
        <div class="cols">
          <div>
            <h3>Controls</h3>
            <table class="keys">
              <tr><td><kbd>←↑↓→</kbd> or <kbd>WASD</kbd></td><td>Walk</td></tr>
              <tr><td><kbd>Shift</kbd></td><td>Run</td></tr>
              <tr><td><kbd>Space</kbd> / <kbd>E</kbd></td><td>Action (pick up, use, take cover)</td></tr>
              <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>Pause</td></tr>
            </table>
            <p class="small">On a phone or tablet: use the joystick to walk, the <b>ACT</b> button for actions and <b>RUN</b> to switch running on or off.</p>
          </div>
          <div>
            <h3>Each level has 2 phases</h3>
            <ol>
              <li><b>Prepare:</b> pack an emergency kit before time runs out. Useful items give points — useless ones cost points!</li>
              <li><b>Disaster:</b> follow the objective at the top of the screen. The yellow arrow shows where to go.</li>
            </ol>
            <p>Watch your <b>health</b>. Safe choices earn points; risky ones show a tip and can hurt you.</p>
            <p>After each level, answer a <b>3-question quiz</b> for bonus points.</p>
          </div>
        </div>
        <button class="btn primary" data-act="back" autofocus>Got it!</button>
      </div>`, { back });
  }

  function levelSelect(g) {
    const unlocked = DR.Store.get('unlocked', 1);
    const best = DR.Store.get('best', {});
    const cards = DR.LEVELS.map((lv, i) => {
      const open = i < unlocked;
      return `<button class="level-card ${open ? '' : 'locked'}" data-act="pick" data-arg="${i}" ${open ? '' : 'disabled'} style="--c:${lv.color}">
          <span class="lc-num">${lv.number}</span>
          ${icon(lv.icon, 44)}
          <b>${esc(lv.name)}</b>
          <small>${esc(lv.place)}</small>
          <em>${open ? (best[lv.id] ? 'Best: ' + best[lv.id] : 'Not played yet') : 'Locked'}</em>
        </button>`;
    }).join('');
    show(`
      <div class="card wide">
        <h2>Choose a level</h2>
        <p class="small">Finish a level to unlock the next one.</p>
        <div class="level-grid">${cards}</div>
        <button class="btn" data-act="back">Back</button>
      </div>`, {
      pick: (i) => g.startRun(Number(i)),
      back: () => title(g)
    });
  }

  function levelIntro(g, level, fact) {
    show(`
      <div class="card">
        ${levelBadge(level)}
        <h2>${esc(level.name)} <small>· ${esc(level.place)}</small></h2>
        <p>${esc(level.intro)}</p>
        <div class="fact"><div class="fact-title">${icon('firstaid', 28)} Did you know?</div><p>${esc(fact)}</p></div>
        <div class="phase-steps">
          <div><b>1. Prepare</b><span>Pack your emergency kit at home (${DR.CONFIG.PREPARE_SECONDS} seconds)</span></div>
          <div><b>2. Disaster</b><span>Make safe choices to stay healthy</span></div>
        </div>
        <button class="btn primary" data-act="go" autofocus>Start packing!</button>
      </div>`, { go: () => g.beginPrepare() });
  }

  function kitSummary(g, level, s) {
    const all = s.found.concat(s.missing);
    const items = all.map((id) => `<div class="kit-item ${s.found.includes(id) ? 'got' : 'miss'}">${icon(id, 34)}<span>${esc(DR.ITEMS[id].name)}</span></div>`).join('');
    const msg = s.missing.length === 0
      ? `<p class="good-msg">Perfect kit! Bonus +${s.bonus}</p>`
      : `<p>You packed <b>${s.found.length}</b> of ${all.length} useful items. The faded ones are missing.</p>`;
    show(`
      <div class="card">
        <h2>Kit check</h2>
        ${msg}
        <div class="kit-grid">${items}</div>
        ${s.wrong.length ? `<p class="small">Left behind ${s.wrong.length} useless item${s.wrong.length > 1 ? 's' : ''} — good thinking next time!</p>` : ''}
        <div class="briefing">${levelBadge(level)}<p>${esc(level.briefing)}</p></div>
        <button class="btn primary danger" data-act="go" autofocus>I'm ready!</button>
      </div>`, { go: () => g.beginDisaster() });
  }

  function pause(g) {
    show(`
      <div class="card narrow">
        <h2>Paused</h2>
        <div class="menu">
          <button class="btn primary" data-act="resume" autofocus>Resume</button>
          <button class="btn" data-act="restart">Restart level</button>
          <button class="btn" data-act="howto">How to play</button>
          <button class="btn ghost" data-act="sound">${soundLabel()}</button>
          <button class="btn ghost" data-act="quit">Quit to menu</button>
        </div>
      </div>`, {
      resume: () => g.resume(),
      restart: () => g.restartLevel(),
      howto: () => howTo(() => pause(g)),
      sound: () => { DR.Audio.toggle(); g.refreshSoundButton(); pause(g); },
      quit: () => g.quitToMenu()
    });
  }

  function levelComplete(g, level, log, levelScore) {
    const rows = log.map((r) => `<tr><td>${esc(r.label)}</td><td class="${r.n < 0 ? 'neg' : 'pos'}">${r.n > 0 ? '+' : ''}${r.n}</td></tr>`).join('');
    show(`
      <div class="card">
        ${levelBadge(level)}
        <h2>Level complete!</h2>
        <div class="log"><table>${rows}</table></div>
        <p class="total">Level score so far: <b>${levelScore}</b></p>
        <p>Now answer 3 quick questions for bonus points.</p>
        <button class="btn primary" data-act="quiz" autofocus>Start the quiz</button>
      </div>`, { quiz: () => g.startQuiz() });
  }

  /** Runs a quiz. Calls done(numberCorrect) at the end. */
  function quiz(level, questions, done) {
    let i = 0;
    let correct = 0;
    const ask = () => {
      const q = questions[i];
      const order = DR.U.shuffle(q.options.map((text, idx) => ({ text, idx })));
      show(`
        <div class="card quiz">
          ${levelBadge(level)} <span class="q-count">Question ${i + 1} of ${questions.length}</span>
          <h2 class="q">${esc(q.q)}</h2>
          <div class="answers">
            ${order.map((o, n) => `<button class="btn answer" data-act="answer" data-arg="${o.idx}"><span class="num">${n + 1}</span>${esc(o.text)}</button>`).join('')}
          </div>
          <div class="why hidden"></div>
          <button class="btn primary next hidden" data-act="next">${i + 1 < questions.length ? 'Next question' : 'See results'}</button>
        </div>`, {
        answer: (arg) => {
          const pick = Number(arg);
          const right = pick === q.answer;
          if (right) correct++;
          DR.Audio.play(right ? 'right' : 'wrong');
          overlay.querySelectorAll('.answer').forEach((b) => {
            b.disabled = true;
            const idx = Number(b.dataset.arg);
            if (idx === q.answer) b.classList.add('correct');
            else if (idx === pick) b.classList.add('wrong');
          });
          const why = overlay.querySelector('.why');
          why.innerHTML = `<b>${right ? 'Correct! +' + DR.CONFIG.POINTS.quizCorrect : 'Not quite.'}</b> ${esc(q.why)}`;
          why.className = 'why ' + (right ? 'ok' : 'no');
          const next = overlay.querySelector('.next');
          next.classList.remove('hidden');
          next.focus({ preventScroll: true });
        },
        next: () => {
          i++;
          if (i < questions.length) ask();
          else done(correct);
        }
      });
    };
    ask();
  }

  function levelResult(g, level, r) {
    show(`
      <div class="card">
        ${levelBadge(level)}
        <h2>${esc(level.name)} — results</h2>
        <div class="stars">${[0, 1, 2].map((n) => `<span class="${n < r.correct ? 'on' : ''}">★</span>`).join('')}</div>
        <p>Quiz: <b>${r.correct}/${r.total}</b> correct (+${r.bonus})</p>
        <div class="score-row">
          <div><small>Level score</small><b>${r.levelScore}</b></div>
          <div><small>Total score</small><b>${r.total_score}</b></div>
        </div>
        ${r.unlockedNew ? `<p class="good-msg">New level unlocked!</p>` : ''}
        <div class="menu row">
          <button class="btn primary" data-act="next" autofocus>${r.hasNext ? 'Next level' : 'See final score'}</button>
          <button class="btn ghost" data-act="menu">Menu</button>
        </div>
      </div>`, {
      next: () => g.nextLevel(),
      menu: () => g.quitToMenu()
    });
  }

  function fail(g, level, reason) {
    show(`
      <div class="card narrow">
        ${levelBadge(level)}
        <h2>Ouch! Let's try again</h2>
        <p>You ran out of health. Remember:</p>
        <div class="fact"><p>${esc(reason || 'Make safe choices and avoid danger zones.')}</p></div>
        <div class="menu">
          <button class="btn primary" data-act="retry" autofocus>Try again</button>
          <button class="btn ghost" data-act="menu">Menu</button>
        </div>
      </div>`, {
      retry: () => g.restartLevel(),
      menu: () => g.quitToMenu()
    });
  }

  function end(g, r) {
    show(`
      <div class="card end">
        ${LOGO}
        <h2>You finished!</h2>
        <p class="final">Final score <b>${r.score}</b></p>
        <div class="rank rank-${r.rankIndex}"><small>Your rank</small><b>${esc(r.rank)}</b></div>
        <p>${r.isNew ? '<span class="good-msg">New high score!</span>' : 'High score: <b>' + r.high + '</b>'}</p>
        <div class="remember">
          <b>Remember:</b>
          <ul>
            <li>Earthquake: <b>Drop, Cover and Hold On</b>.</li>
            <li>Flood: <b>move to higher ground</b> — never walk or drive through floodwater.</li>
            <li>Heatwave: <b>stay in the shade and drink water</b>.</li>
            <li>Storm: <b>shelter inside and follow official alerts</b>.</li>
          </ul>
        </div>
        <div class="menu row">
          <button class="btn primary" data-act="again" autofocus>Play again</button>
          <button class="btn ghost" data-act="menu">Menu</button>
        </div>
      </div>`, {
      again: () => g.startRun(0),
      menu: () => g.quitToMenu()
    });
  }

  // ---------------- Animated menu background ----------------
  const walker = new DR.Character(0, 470, 'student', { facing: 'right' });
  walker.moving = true;

  function drawBackdrop(ctx, t) {
    const W = DR.CONFIG.WIDTH;
    const H = DR.CONFIG.HEIGHT;
    const G = DR.G;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#8ecae6');
    sky.addColorStop(1, '#d8f3dc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // sun and clouds
    G.circle(ctx, 820, 90, 46, '#ffd166');
    [[(t * 12) % (W + 200) - 100, 80], [(t * 8 + 400) % (W + 200) - 100, 140], [(t * 10 + 700) % (W + 200) - 100, 60]].forEach(([x, y]) => {
      G.circle(ctx, x, y, 22, '#ffffff'); G.circle(ctx, x + 24, y - 8, 26, '#ffffff'); G.circle(ctx, x + 50, y, 20, '#ffffff');
    });
    // hills
    ctx.fillStyle = '#95d5b2';
    ctx.beginPath(); ctx.moveTo(0, 360);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 340 - Math.sin(x / 140) * 40 - Math.sin(x / 60) * 8);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#74c69d';
    ctx.beginPath(); ctx.moveTo(0, 420);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 400 - Math.sin(x / 200 + 1) * 30);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // little town
    [[80, '#e76f51'], [200, '#f4a261'], [640, '#2a9d8f'], [760, '#e9c46a'], [880, '#ef476f']].forEach(([x, roof], i) => {
      const y = 380 + (i % 2) * 10;
      G.box(ctx, x, y, 70, 50, { fill: '#fefae0', r: 3 });
      ctx.fillStyle = roof; ctx.strokeStyle = G.OUTLINE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 8, y + 2); ctx.lineTo(x + 35, y - 30); ctx.lineTo(x + 78, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      G.box(ctx, x + 27, y + 24, 16, 26, { fill: '#a0673b', r: 2 });
    });
    // path and walking student
    ctx.fillStyle = '#e9dcc2';
    ctx.fillRect(0, 455, W, 40);
    walker.x = ((t * 60) % (W + 80)) - 40;
    walker.y = 482;
    walker.walkT = t * 10;
    DR.People.draw(ctx, walker, t);
  }

  return { init, show, hide, title, howTo, levelSelect, levelIntro, kitSummary, pause, levelComplete, quiz, levelResult, fail, end, drawBackdrop };
})();
