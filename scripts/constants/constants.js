/**
 * ============================================================================
 * WordleHelper - Constants & Configuration
 * ============================================================================
 * Defines grid dimensions, keyboard layout, color palettes for dark and light
 * modes, tile evaluation states, and animation timing parameters.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Constants = {
  /**
   * Grid dimensions for standard 5-letter Wordle puzzle
   */
  GRID: {
    ROWS: 6,
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
   * Dark theme color palette (RGB triplets)
   */
  DARK_COLORS: {
    bg: [18, 18, 19],
    tileBorderEmpty: [58, 58, 60],
    tileBorderActive: [86, 87, 88],
    tileBg: [18, 18, 19],
    keyBg: [129, 131, 132],
    keyText: [255, 255, 255],
    correct: [83, 141, 78],     // Green
    present: [181, 159, 59],    // Yellow
    absent: [58, 58, 60],       // Dark Gray
    text: [255, 255, 255],
    emptyTileText: [255, 255, 255],
    keyUnavailableBg: [36, 36, 38],
    keyUnavailableText: [90, 90, 92],
    keyEnterDisabledBg: [36, 36, 38],
    keyEnterDisabledText: [90, 90, 92],
    toastBg: [255, 255, 255],
    toastText: [18, 18, 19],
  },

  /**
   * Light theme color palette (RGB triplets)
   */
  LIGHT_COLORS: {
    bg: [255, 255, 255],
    tileBorderEmpty: [211, 214, 218],
    tileBorderActive: [135, 138, 140],
    tileBg: [255, 255, 255],
    keyBg: [211, 214, 218],
    keyText: [26, 26, 27],
    correct: [106, 170, 100],   // Green
    present: [201, 180, 88],    // Yellow
    absent: [120, 124, 126],    // Light Gray
    text: [255, 255, 255],
    emptyTileText: [26, 26, 27],
    keyUnavailableBg: [244, 244, 245],
    keyUnavailableText: [185, 187, 190],
    keyEnterDisabledBg: [244, 244, 245],
    keyEnterDisabledText: [185, 187, 190],
    toastBg: [26, 26, 27],
    toastText: [255, 255, 255],
  },

  /** Active colors pointer (updated dynamically by ThemeManager) */
  COLORS: null,

  /**
   * Tile evaluation states in order of user click cycling
   * Defaults to Green (correct) on key press, then cycles to Blank/Gray (absent) -> Yellow (present) -> Green (correct).
   * Note: No blank (empty) color state for filled grid cells.
   */
  TILE_STATES: ["correct", "absent", "present"],

  /**
   * Priority hierarchy for keyboard key coloring
   */
  STATE_PRIORITY: {
    empty: -1,
    absent: 0,
    present: 1,
    correct: 2,
  },

  /**
   * Animation durations and timing limits
   */
  ANIMATION: {
    FLIP_DURATION_MS: 300,
    TOAST_DURATION_FRAMES: 120,
  },
};

// Initialize active colors to DARK_COLORS by default
WordleApp.Constants.COLORS = { ...WordleApp.Constants.DARK_COLORS };
