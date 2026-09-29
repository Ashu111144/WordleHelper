/**
 * ============================================================================
 * WordleHelper - Canvas Renderer
 * ============================================================================
 * Handles p5.js drawing loops: animated 6x5 board grid with 3D flips,
 * interactive on-screen keyboard with disabled Enter key, and floating toasts.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Renderer = {
  /**
   * Draws the 6x5 tile grid, handling letter typography and flip animations.
   *
   * @param {Object} layout - Computed layout metrics.
   * @param {Array<Array<Object>>} grid - 2D grid matrix of cell objects.
   */
  drawGrid(layout, grid) {
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    const { COLORS, ANIMATION } = WordleApp.Constants;
    const { tileSize, tileGap } = layout;

    const startX = (width - (COLS * tileSize + (COLS - 1) * tileGap)) / 2;
    const startY = layout.gridStartY;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = startX + c * (tileSize + tileGap);
        const y = startY + r * (tileSize + tileGap);
        const cell = grid[r][c];
        let state = cell.state;
        let flipScale = 1;

        // Process vertical flip animation if active on this cell
        if (cell.flip) {
          const progress = Math.min(1, (millis() - cell.flip.startedAt) / ANIMATION.FLIP_DURATION_MS);
          flipScale = Math.max(0.04, Math.abs(Math.cos(progress * Math.PI)));
          // Color changes halfway through the flip
          state = progress < 0.5 ? cell.flip.from : cell.flip.to;

          if (progress >= 1) {
            cell.flip = null;
            flipScale = 1;
            state = cell.state;
          }
        }

        push();
        translate(x + tileSize / 2, y + tileSize / 2);
        scale(1, flipScale);

        // Cell background & border coloration based on evaluation state
        if (state === "correct") {
          fill(COLORS.correct);
          stroke(COLORS.correct);
        } else if (state === "present") {
          fill(COLORS.present);
          stroke(COLORS.present);
        } else if (state === "absent") {
          fill(COLORS.absent);
          stroke(COLORS.absent);
        } else {
          // Empty / blank tile state
          fill(COLORS.tileBg);
          stroke(cell.letter ? COLORS.tileBorderActive : COLORS.tileBorderEmpty);
        }

        strokeWeight(2);
        rect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 4);

        // Cell letter text
        if (cell.letter) {
          noStroke();
          // Use emptyTileText (dark text) for blank tiles in light mode
          fill(state === "empty" ? (COLORS.emptyTileText || COLORS.text) : COLORS.text);
          textSize(Math.round(tileSize * 0.52));
          textStyle(BOLD);
          text(cell.letter, 0, 1.5);
        }

        pop();
      }
    }
  },

  /**
   * Draws the on-screen keyboard, renders disabled Enter key, and collects hitboxes.
   *
   * @param {Object} layout - Computed layout metrics.
   * @param {Object} keyStates - Revealed feedback state for each key.
   * @param {Set<string>} possibleLetters - Set of letters mathematically allowed.
   * @param {Array<Object>} keyButtons - Output array storing button hitboxes for click detection.
   */
  drawKeyboard(layout, keyStates, possibleLetters, keyButtons) {
    const { KEYBOARD_ROWS, COLORS } = WordleApp.Constants;
    const { keyH, keyGap, baseKeyW, keyboardStartY } = layout;

    // Clear previous frame hitboxes
    keyButtons.length = 0;

    for (let r = 0; r < KEYBOARD_ROWS.length; r++) {
      const row = KEYBOARD_ROWS[r];
      let totalRowW = 0;

      for (let i = 0; i < row.length; i++) {
        const k = row[i];
        totalRowW += (k === "ENTER" || k === "BACK" ? baseKeyW * 1.5 : baseKeyW) + keyGap;
      }
      totalRowW -= keyGap;

      let currX = (width - totalRowW) / 2;
      const currY = keyboardStartY + r * (keyH + keyGap);

      for (let i = 0; i < row.length; i++) {
        const k = row[i];
        const keyW = k === "ENTER" || k === "BACK" ? baseKeyW * 1.5 : baseKeyW;
        const isEnter = k === "ENTER";
        const isUnavailable = /^[A-Z]$/.test(k) && !possibleLetters.has(k);
        const isDisabled = isEnter || isUnavailable;

        // Color key based on revealed state or disabled status
        const state = keyStates[k];
        if (isEnter) {
          fill(COLORS.keyEnterDisabledBg);
        } else if (isUnavailable) {
          fill(COLORS.keyUnavailableBg);
        } else if (state === "correct") {
          fill(COLORS.correct);
        } else if (state === "present") {
          fill(COLORS.present);
        } else if (state === "absent") {
          fill(COLORS.absent);
        } else {
          fill(COLORS.keyBg);
        }

        noStroke();
        rect(currX, currY, keyW, keyH, 4);

        // Key label text
        if (isEnter) {
          fill(COLORS.keyEnterDisabledText);
        } else if (isUnavailable) {
          fill(COLORS.keyUnavailableText);
        } else if (state === "correct" || state === "present" || state === "absent") {
          fill(COLORS.text);
        } else {
          fill(COLORS.keyText || COLORS.text);
        }

        const labelText = isEnter ? "ENTER" : (k === "BACK" ? "⌫" : k);
        textSize((k.length > 1 ? 10 : 13) * layout.scale);
        textStyle(BOLD);
        text(labelText, currX + keyW / 2, currY + keyH / 2);

        // Save hitbox for mouse/touch interactions
        keyButtons.push({
          key: k,
          x: currX,
          y: currY,
          w: keyW,
          h: keyH,
          disabled: isDisabled,
        });

        currX += keyW + keyGap;
      }
    }
  },

  /**
   * Draws the floating toast banner if active.
   *
   * @param {Object} layout - Computed layout metrics.
   * @param {string} message - Toast message text.
   * @param {number} messageTimer - Remaining frames for toast visibility.
   */
  drawToast(layout, message, messageTimer) {
    if (messageTimer <= 0 || !message) return;

    const { COLORS } = WordleApp.Constants;
    const scale = layout.scale;

    push();
    fill(COLORS.toastBg || [255, 255, 255]);
    stroke(COLORS.tileBorderEmpty || [80, 80, 80]);
    strokeWeight(1);
    rectMode(CENTER);

    textSize(13 * scale);
    textStyle(BOLD);
    const boxW = Math.max(160, textWidth(message) + 32 * scale);
    const boxH = 34 * scale;
    const toastY = Math.max(26 * scale, layout.gridStartY - 16);

    rect(width / 2, toastY, boxW, boxH, 6);

    noStroke();
    fill(COLORS.toastText || [0, 0, 0]);
    textAlign(CENTER, CENTER);
    text(message, width / 2, toastY);
    rectMode(CORNER);
    pop();
  },

  /**
   * Main render loop method called on every p5 draw tick.
   */
  render() {
    const { COLORS } = WordleApp.Constants;
    const state = WordleApp.State;
    const layout = WordleApp.Layout.getLayout(width, height);

    background(COLORS.bg);

    this.drawGrid(layout, state.grid);
    this.drawKeyboard(layout, state.keyStates, state.possibleLetters, state.keyButtons);
    this.drawToast(layout, state.message, state.messageTimer);

    // Decrement toast frame counter
    state.tickToast();
  },
};
