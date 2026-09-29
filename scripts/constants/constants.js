/**
 * ============================================================================
 * Wordle Solver - Constants & Configuration
 * ============================================================================
 * Defines game dimensions, keyboard layout, color palettes,
 * tile states, and animation timing parameters.
 */

// Initialize root namespace
window.WordleApp = window.WordleApp || {};

WordleApp.Constants = Object.freeze({
  /**
   * Grid dimensions for standard 5-letter Wordle puzzle
   */
  GRID: {
    ROWS: 5,
    COLS: 5,
  },

  /**
   * Physical QWERTY keyboard layout rows
   */
  KEYBOARD_ROWS: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
  ],

  /**
   * Dark theme color palette (RGB triplets compatible with p5.js fill/stroke)
   */
  COLORS: {
    bg: [18, 18, 19],
    tileBorderEmpty: [58, 58, 60],
    tileBorderActive: [86, 87, 88],
    tileBg: [18, 18, 19],
    keyBg: [129, 131, 132],
    correct: [83, 141, 78],  // Green: Letter is correct and in the right position
    present: [181, 159, 59], // Yellow: Letter is in the word but wrong position
    absent: [58, 58, 60],    // Dark Gray: Letter is not in the word
    text: [255, 255, 255],
    keyUnavailableBg: [45, 45, 46],
    keyUnavailableText: [105, 105, 106],
  },

  /**
   * Tile evaluation states in order of user click cycling
   */
  TILE_STATES: ["empty", "absent", "present", "correct"],

  /**
   * Priority hierarchy for keyboard key coloring
   * Higher priority states overwrite lower priority states
   */
  STATE_PRIORITY: {
    absent: 0,
    present: 1,
    correct: 2,
  },

  /**
   * Animation durations and timing limits
   */
  ANIMATION: {
    FLIP_DURATION_MS: 420,
    TOAST_DURATION_FRAMES: 120, // ~2 seconds at 60 FPS
  },
});

// Backwards-compatible aliases for global access
const ROWS = WordleApp.Constants.GRID.ROWS;
const COLS = WordleApp.Constants.GRID.COLS;
const KB_ROWS = WordleApp.Constants.KEYBOARD_ROWS;
const COLORS = WordleApp.Constants.COLORS;
