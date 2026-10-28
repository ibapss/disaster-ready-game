/*
 * Disaster Ready — global namespace and game settings.
 *
 * Every other script adds its own part to the shared `DR` object,
 * e.g. DR.Input, DR.Audio, DR.World. Scripts are loaded in order by
 * index.html (no build step needed).
 *
 * Change the numbers below to tweak how the game feels.
 */
window.DR = window.DR || {};

DR.CONFIG = {
  WIDTH: 960,            // logical size of the game view (it scales to fit the screen)
  HEIGHT: 540,
  PLAYER_SPEED: 140,     // pixels per second when walking
  RUN_MULTIPLIER: 1.6,   // running speed = walking speed × this
  INTERACT_RADIUS: 46,   // how close you must be to use something
  PREPARE_SECONDS: 60,   // time limit for packing the emergency kit
  MAX_HEALTH: 100,

  POINTS: {
    goodItem: 50,            // useful kit item
    uselessItem: -30,        // useless item
    fullKitBonus: 100,       // found every useful item
    timeBonusPerSecond: 3,   // seconds left when the kit is complete
    healthBonusPerPoint: 2,  // health left at the end of a disaster × this
    quizCorrect: 50          // each correct quiz answer
  },

  // Your rank depends on your average score per level played.
  RANKS: [
    { name: 'Beginner', min: 0 },
    { name: 'Safety Scout', min: 800 },
    { name: 'Disaster Ready Hero', min: 1300 }
  ]
};
