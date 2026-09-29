/**
 * ============================================================================
 * Wordle Solver - Game & Solver State Management
 * ============================================================================
 * Stores and manages the mutable application state, including board grid cells,
 * current input cursor, candidate word lists, keyboard button bounds, and toasts.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.State = {
  /**
   * 2D array representing the 5x5 board:
   * Array<Array<{ letter: string, state: 'empty' | 'absent' | 'present' | 'correct', flip: Object|null }>>
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

  /** List of words valid against all submitted & confirmed rows */
  remainingWords: [],

  /** List of words dynamically valid against current unsubmitted typing */
  liveWords: [],

  /** Set of uppercase letters that appear in at least one word in liveWords */
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

    this.remainingWords = Array.isArray(initialWordList) ? [...initialWordList] : [];
    this.liveWords = [...this.remainingWords];
    this.possibleLetters = new Set();
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
