/**
 * ============================================================================
 * Wordle Solver - Responsive Layout Calculator
 * ============================================================================
 * Calculates scalable dimensions, gaps, and positioning for the board tiles,
 * on-screen keyboard, and header based on viewport dimensions.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Layout = {
  /**
   * Calculates responsive layout parameters for the canvas.
   *
   * @param {number} width - Canvas width in pixels.
   * @param {number} height - Canvas height in pixels.
   * @returns {Object} Computed layout properties (scale, tileSize, tileGap, keyH, etc.).
   */
  getLayout(width, height) {
    const { COLS } = WordleApp.Constants.GRID;
    const { KEYBOARD_ROWS } = WordleApp.Constants;

    // Viewport scaling factor clamped between 0.2 and 1.0
    const scale = Math.min(1, Math.max(0.2, (height - 40) / 520));

    // Tile metrics
    const tileGap = 6 * scale;
    const tileSize = Math.min(52 * scale, (width - 32 - 4 * tileGap) / COLS);

    // Keyboard metrics
    const keyGap = 6 * scale;
    const baseKeyW = Math.min(38 * scale, (width - 24 - 9 * keyGap) / 10);
    const keyH = 54 * scale;
    const keyboardHeight = KEYBOARD_ROWS.length * keyH + (KEYBOARD_ROWS.length - 1) * keyGap;

    return {
      scale,
      tileGap,
      tileSize,
      gridStartY: 70 * scale,
      keyGap,
      baseKeyW,
      keyH,
      keyboardStartY: height - keyboardHeight - 18 * scale,
    };
  },
};
