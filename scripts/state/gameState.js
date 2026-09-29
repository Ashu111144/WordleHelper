/**
 * ============================================================================
 * WordleHelper - State Management
 * ============================================================================
 * Stores and manages the mutable application state: 6x5 board cells,
 * current cursor, live candidate word lists, letter availability, and toasts.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.State = {
  /**
   * 2D array representing the 6x5 board:
   * Array<Array<{ letter: string, state: 'correct'|'present'|'absent'|'empty', flip: Object|null }>>
   */
  grid: [],

  /** Current active row index (0 to ROWS - 1) */
  currentRow: 0,

  /** Current active column index (0 to COLS) */
  currentCol: 0,

  /** Indicates if the game has ended (either solved or ran out of attempts) */
  gameOver: false,

  /** Text message for on-canvas toast notification */
  message: "",

  /** Remaining frames for displaying the toast (~60 fps) */
  messageTimer: 0,

  /** List of words valid against all confirmed rows */
  remainingWords: [],

  /** List of words dynamically valid against current typing & feedback */
  liveWords: [],

  /** Set of uppercase letters that can appear next in liveWords */
  possibleLetters: new Set(),

  /** Map tracking the highest revealed state for each keyboard letter (letter -> state) */
  keyStates: {},

  /** Click bounding boxes for on-screen keyboard buttons [{ key, x, y, w, h }, ...] */
  keyButtons: [],

  /**
   * Initializes or resets the board and dictionary state.
   * @param {string[]} initialWordList - Master dictionary of 5-letter words.
   */
  init(initialWordList = []) {
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.grid[r][c] = {
          letter: "",
          state: "empty",
          flip: null,
        };
      }
    }

    this.currentRow = 0;
    this.currentCol = 0;
    this.gameOver = false;
    this.message = "";
    this.messageTimer = 0;
    this.keyStates = {};
    this.keyButtons = [];

    const masterList = Array.isArray(initialWordList) && initialWordList.length > 0
      ? initialWordList
      : (typeof WORD_LIST !== "undefined" ? WORD_LIST : []);

    this.remainingWords = [...masterList];
    this.liveWords = [...this.remainingWords];
    this.possibleLetters = new Set();
  },

  /**
   * Resets everything back to fresh new game state.
   */
  reset() {
    const masterList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];
    this.init(masterList);
    if (WordleApp.Solver) {
      WordleApp.Solver.refreshLiveCandidates();
    }
    this.showToast("Reset complete", 90);
  },

  /**
   * Displays an on-screen toast message for a specified duration in frames.
   * @param {string} msg - Message text to display.
   * @param {number} [durationFrames=120] - Number of frames to keep toast visible.
   */
  showToast(msg, durationFrames = WordleApp.Constants.ANIMATION.TOAST_DURATION_FRAMES) {
    this.message = msg;
    this.messageTimer = durationFrames;
  },

  /**
   * Decrements the toast timer by 1 frame if active.
   */
  tickToast() {
    if (this.messageTimer > 0) {
      this.messageTimer--;
    }
  },
};
