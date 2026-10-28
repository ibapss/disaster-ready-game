/*
 * Automated play-through test for Disaster Ready.
 *
 *   node tests/playtest.js [screenshot-folder]
 *
 * Needs Node.js and Playwright (npm install playwright).
 * It opens index.html in a headless browser, plays all four levels with
 * the bot in tests/bot.js (clicking the real menu buttons and answering
 * the quizzes), then checks the end screen, high score, game over,
 * pause menu and level select.
 */
const { chromium } = require('playwright');
const path = require('path');

const OUT = process.argv[2];
const URL = 'file://' + path.resolve(__dirname, '../index.html') + '?test';

function assert(ok, msg) {
  if (!ok) throw new Error('FAILED: ' + msg);
  console.log('  ok -', msg);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.addScriptTag({ path: path.join(__dirname, 'bot.js') });

  const shot = async (name) => {
    if (!OUT) return;
    await page.evaluate(() => DR.Game.render());
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
  };
  const click = async (act) => {
    await page.click(`#overlay [data-act="${act}"]`);
  };

  console.log('Full run through all levels');
  await click('play');
  const levels = await page.evaluate(() => DR.LEVELS.map((l) => l.id));
  for (const [i, id] of levels.entries()) {
    console.log(`Level ${i + 1}: ${id}`);
    assert(await page.isVisible('text=Did you know?'), 'intro shows a "Did you know?" card');
    await click('go');
    const prep = await page.evaluate(() => Bot.playPrepare({ takeBad: 1 }));
    assert(prep.kit.length === 9, `packed all 9 useful items (${prep.kit.join(', ')})`);
    assert(await page.isVisible('text=Kit check'), 'kit check screen shown');
    await click('go');
    await shot(`${i + 1}-${id}-start`);
    const res = await page.evaluate((id) => Bot.playDisaster(id), id);
    assert(res.state === 'overlay', `disaster phase completed (health ${res.health}, score ${res.score})`);
    await shot(`${i + 1}-${id}-complete`);
    assert(await page.isVisible('text=Level complete!'), 'level complete screen shown');
    await click('quiz');
    for (let q = 0; q < 3; q++) {
      const answer = await page.evaluate((id) => {
        const text = document.querySelector('#overlay .q').textContent;
        return DR.QUIZZES[id].find((x) => x.q === text).answer;
      }, id);
      await page.click(`#overlay [data-act="answer"][data-arg="${answer}"]`);
      assert(await page.isVisible('#overlay .why.ok'), `quiz question ${q + 1} answered correctly`);
      if (q === 0) await shot(`${i + 1}-${id}-quiz`);
      await click('next');
    }
    assert(await page.isVisible('text=3/3'), 'quiz result 3/3');
    await click('next');
  }

  assert(await page.isVisible('text=You finished!'), 'end screen shown');
  await shot('end');
  const end = await page.evaluate(() => ({
    score: DR.Game.score,
    rank: document.querySelector('.rank b').textContent,
    high: DR.Store.get('highScore', 0),
    unlocked: DR.Store.get('unlocked', 1)
  }));
  console.log('  final score', end.score, 'rank', end.rank);
  assert(end.high === end.score, 'high score saved in localStorage');
  assert(end.unlocked === 4, 'all levels unlocked');
  assert(end.rank === 'Disaster Ready Hero', 'perfect play gets the top rank');

  console.log('Level select, pause and game over');
  await click('menu');
  await click('levels');
  assert((await page.$$('#overlay .level-card:not(.locked)')).length === 4, 'level select shows 4 unlocked levels');
  await page.click('#overlay [data-act="pick"][data-arg="1"]');
  await click('go');
  await page.evaluate(() => { Bot.tick(5); DR.Game.scene.finish(); });
  await click('go');
  await page.keyboard.press('Escape');
  await page.evaluate(() => Bot.tick(1));
  assert(await page.evaluate(() => DR.Game.state) === 'paused', 'Escape pauses the game');
  await click('resume');
  assert(await page.evaluate(() => DR.Game.state) === 'play', 'Resume continues the game');
  // walk into the flooded river until health runs out
  const failed = await page.evaluate(() => {
    const it = DR.Game.scene.world.interactables.find((i) => /main power/.test(i.label));
    Bot.goTo({ x: it.x, y: it.y }, { tol: 24 });
    Bot.act();
    Bot.goTo({ x: 120, y: 500 }, { tol: 20, maxT: 30 });
    Bot.waitUntil(() => DR.Game.state !== 'play', 30);
    DR.Input.bot = null;
    return DR.Game.state;
  });
  assert(failed === 'overlay' && await page.isVisible('text=Ouch!'), 'walking into floodwater leads to game over');
  await shot('game-over');
  await click('retry');
  assert(await page.evaluate(() => DR.Game.state === 'play' && DR.Game.phase === 'prepare'), 'Try again restarts the level');

  // touch controls appear on phones
  await page.evaluate(() => DR.Input.setTouchMode(true));
  assert(await page.isVisible('#joystick') && await page.isVisible('#btn-action'), 'touch joystick and action button shown in touch mode');
  await shot('touch-controls');

  assert(errors.length === 0, 'no JavaScript errors' + (errors.length ? ':\n' + errors.join('\n') : ''));
  await browser.close();
  console.log('\nAll tests passed.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
