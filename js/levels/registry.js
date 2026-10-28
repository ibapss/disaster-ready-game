/*
 * The list of levels. Each level file calls DR.registerLevel({...}).
 *
 * To ADD A NEW LEVEL:
 *   1. Copy one of the level files (e.g. js/levels/heatwave.js) and rename it.
 *   2. Give it a new id and number, and change the map and rules.
 *   3. Add facts in js/data/facts.js and quiz questions in js/data/quizzes.js
 *      using the same id.
 *   4. Add a <script> tag for the new file in index.html.
 *
 * A level definition looks like:
 * {
 *   id: 'flood', number: 2, name: 'Flood', place: 'Home by the river',
 *   color: '#4895ef',                        // colour used in menus
 *   intro: 'One sentence about the level',
 *   briefing: 'What to do in the disaster phase',
 *   kitExtras: { good: ['raincoat'], bad: ['hairdryer'] },
 *   Scene: FloodScene                         // class for the disaster phase
 * }
 */
DR.LEVELS = [];

DR.registerLevel = function (def) {
  DR.LEVELS.push(def);
  DR.LEVELS.sort((a, b) => a.number - b.number);
};
