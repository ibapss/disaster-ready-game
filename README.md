# Disaster Ready

A friendly browser game for students aged 10–16 about what to do **before, during and after** natural disasters.

Play as a student in a small town, pack an emergency kit, and make safe choices through four disasters:

| Level | Disaster | Where | What you practise |
|---|---|---|---|
| 1 | Earthquake | School | Drop, Cover and Hold On; avoid windows, shelves and lights; walk to the assembly area; react to aftershocks |
| 2 | Flood | Home by the river | Switch off the main electricity; move to higher ground; never walk through floodwater; keep away from fallen power lines; help neighbours |
| 3 | Heatwave | Market | Stay in the shade; drink water; don't run in the midday sun; help someone with heatstroke signs |
| 4 | Storm / Cyclone | Home and neighbourhood | Secure loose objects; close shutters; shelter in an inner room; stay inside during the "eye"; follow the radio alert and the evacuation route |

Everything is plain HTML, CSS and JavaScript drawn on an HTML5 canvas. There are no image files, no libraries and no build step. All graphics are drawn in code.

---

## How to play

Open `index.html` in a web browser. That's all.

### Controls

| Action | Keyboard | Phone / tablet |
|---|---|---|
| Walk | Arrow keys or **W A S D** | On-screen joystick (bottom left) |
| Run | **Shift** (hold) | **RUN** button (tap to switch on/off) |
| Action (pick up, use, take cover) | **Space**, **E** or **Enter** | **ACT** button |
| Pause | **Esc** or **P** | Pause button (top right) |

On a phone, turn the screen sideways for a bigger view.

### Each level has two phases

1. **Prepare** (60 seconds): walk around the house and pick up the useful items for an emergency kit, such as water, a torch, a first aid kit, batteries, a power bank, dry food, documents in a plastic bag and a whistle. Useless items (TV remote, video game, perfume…) cost points and show a tip explaining why. Walk to the front door to finish early.
2. **Disaster**: follow the objective at the top of the screen. The yellow arrow shows where to go. Safe choices earn points. Risky ones show a tip and lower your health. Some kit items help you: the first aid kit heals you once, the torch lights up a power cut, and water bottles and a sun hat help in the heatwave.

After each level there is a **3-question quiz** with bonus points. Before each level you see a **"Did you know?"** fact.

### Score and ranks

You score points for kit items, safe actions, health left at the end, and quiz answers. At the end you get a rank based on your average score per level:

- **Beginner**
- **Safety Scout** (800+ per level)
- **Disaster Ready Hero** (1300+ per level)

Your high score and unlocked levels are saved in the browser (`localStorage`).

---

## Editing tips, quiz questions and facts

All the learning content is in `js/data/`. You only need a text editor. Change the text between the quotes, save, and reload the page.

| File | What it contains |
|---|---|
| `js/data/tips.js` | Every safety tip shown during the game. Keep the id (the word before the colon) the same. |
| `js/data/items.js` | Emergency kit items: name, whether it is useful (`good: true/false`), and the tip shown when picked up. |
| `js/data/facts.js` | "Did you know?" facts for each disaster. One is chosen at random. |
| `js/data/quizzes.js` | Quiz questions. Three are picked at random after each level. |

A quiz question looks like this:

```js
{
  q: 'Where should you go when floodwater is rising?',
  options: ['Down into a basement', 'To higher ground, like a hill', 'To the riverbank to watch', 'Into an underpass'],
  answer: 1,   // counting from 0, so 1 = the second option
  why: 'Water flows to low places, so higher ground keeps you safe.'
}
```

Answers are shuffled in the game, so you can put the correct one anywhere.

**Please keep safety advice accurate.** Check new tips against official sources such as your national disaster management agency, the Red Cross / Red Crescent, or Ready.gov.

Other things you can tweak in `js/config.js`: walking speed, the prepare time limit, points for each action and the rank thresholds.

---

## How the code is organised

```
index.html            page layout and the list of scripts (order matters)
css/style.css         HUD, menus and touch controls
js/config.js          settings and points
js/engine/            input, sound, saving, world (collisions, camera), characters
js/gfx/               drawing helpers, item icons, people, props (furniture, trees, buildings…)
js/data/              tips, items, facts, quizzes  ← easy to edit
js/levels/            prepare phase + one file per disaster
js/ui/                HUD and menu screens
js/game.js            game flow: menus → prepare → disaster → quiz → results
tests/                automated play-through test (optional)
```

Each file is small and commented. Every script adds its part to one shared object called `DR` (for example `DR.World` or `DR.Audio`), so the game works when you open the file directly, with no server needed.

### Adding a new level

1. Copy a level file, such as `js/levels/heatwave.js`, and give it a new `id`, `number` and `name`.
2. Change the map (walls, props, zones) in `build()` and the rules in `update()`.
3. Add facts and quiz questions with the same `id` in `js/data/facts.js` and `js/data/quizzes.js`.
4. Add a `<script>` line for your file in `index.html`, under the other levels.

See the comment at the top of `js/levels/registry.js` for the level format.

---

## Publishing with GitHub Pages

1. Push this repository to GitHub.
2. On GitHub, open the repository and go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Pick your branch (for example `main`) and the folder **/ (root)**, then click **Save**.
5. After a minute or two your game will be live at `https://<your-username>.github.io/<repository-name>/`.

The empty `.nojekyll` file tells GitHub Pages to serve the files exactly as they are.

---

## Automated test (optional, for developers)

`tests/playtest.js` opens the game in a headless browser and uses a bot (`tests/bot.js`) to play every level with the real controls. It packs the kit, completes each disaster phase, answers the quizzes, and then checks the end screen, high score, level select, pause menu, game over, "Try again" and the touch controls.

```bash
npm install playwright
npx playwright install chromium
node tests/playtest.js
```

Add a folder name to save screenshots: `node tests/playtest.js screenshots`. The game has a test mode (`index.html?test`) in which the tests drive the clock themselves.

---

## Safety note

This game teaches general preparedness advice. Always follow the instructions of your teachers, parents and local emergency services, because the right action can depend on where you live.
