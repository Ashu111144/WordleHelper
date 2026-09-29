/**
 * ============================================================================
 * WordleHelper - Responsive Layout Calculator
 * ============================================================================
 * Computes fluid dimensions, margins, and coordinate placement for the 6x5 board
 * grid and on-screen keyboard based on dynamic canvas dimensions.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Layout = {
  /**
   * Calculates responsive layout parameters for the canvas viewport.
   *
   * @param {number} width - Canvas width in pixels.
   * @param {number} height - Canvas height in pixels.
   * @returns {Object} Computed layout properties.
   */
  getLayout(width, height) {
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    const { KEYBOARD_ROWS } = WordleApp.Constants;

    // Responsive keyboard metrics
    const keyGap = Math.max(4, Math.min(6, width * 0.012));
    const baseKeyW = Math.min(44, (width - 16 - 9 * keyGap) / 10);
    const keyH = Math.min(58, Math.max(38, baseKeyW * 1.35));
    const keyboardHeight = KEYBOARD_ROWS.length * keyH + (KEYBOARD_ROWS.length - 1) * keyGap;
    const keyboardStartY = Math.max(0, height - keyboardHeight - 12);

    // Responsive tile metrics
    const tileGap = Math.max(4, Math.min(7, width * 0.015));
    const maxTileW = (width - 32 - (COLS - 1) * tileGap) / COLS;
    const availableGridH = Math.max(100, keyboardStartY - 24);
    const maxTileH = (availableGridH - (ROWS - 1) * tileGap) / ROWS;

    const tileSize = Math.min(58, Math.max(30, Math.min(maxTileW, maxTileH)));
    const totalGridHeight = ROWS * tileSize + (ROWS - 1) * tileGap;
    const gridStartY = Math.max(10, (keyboardStartY - totalGridHeight) / 2);

    const scale = Math.min(1.2, Math.max(0.65, tileSize / 52));

    return {
      scale,
      tileGap,
      tileSize,
      gridStartY,
      keyGap,
      baseKeyW,
      keyH,
      keyboardStartY,
    };
  },
};
