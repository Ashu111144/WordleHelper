/**
 * ============================================================================
 * Wordle Solver - Canvas Renderer
 * ============================================================================
 * Encapsulates all p5.js drawing routines: board grid with 3D-flip animations,
 * interactive on-screen keyboard, header status, and floating toast notifications.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Renderer = {
  /**
   * Draws the top header bar with application title and live candidate counter.
   *
   * @param {Object} layout - Computed layout metrics.
   * @param {number} remainingCount - Number of remaining candidate words.
   */
  drawHeader(layout, remainingCount) {
    const { COLORS } = WordleApp.Constants;
    const scale = layout.scale;

    // Header bottom border line
    stroke(58, 58, 60);
    strokeWeight(1);
    line(0, 50 * scale, width, 50 * scale);

    // Title text (left-aligned)
    noStroke();
    fill(COLORS.text);
    textSize(20 * scale);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text("WORDLE SOLVER", 16, 25 * scale);

    // Live candidates badge (right-aligned)
    textAlign(RIGHT, CENTER);
    text(`${remainingCount} LEFT`, width - 16, 25 * scale);

    // Reset text alignment to default
    textAlign(CENTER, CENTER);
  },

  /**
   * Draws the 5x5 tile grid, handling letter rendering and flip animations.
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
          fill(COLORS.tileBg);
          stroke(cell.letter ? COLORS.tileBorderActive : COLORS.tileBorderEmpty);
        }

        strokeWeight(2);
        rect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 4);

        // Cell letter text
        if (cell.letter) {
          noStroke();
          fill(COLORS.text);
          textSize(28 * layout.scale);
          textStyle(BOLD);
          text(cell.letter, 0, 2);
        }

        pop();
      }
    }
  },

  /**
   * Draws the on-screen keyboard, dims impossible letters, and collects click hitboxes.
   *
   * @param {Object} layout - Computed layout metrics.
   * @param {Object} keyStates - Revealed feedback state for each key.
   * @param {Set<string>} possibleLetters - Set of letters still mathematically possible.
   * @param {Array<Object>} keyButtons - Output array storing button hitboxes for click detection.
   */
  drawKeyboard(layout, keyStates, possibleLetters, keyButtons) {
    const { KEYBOARD_ROWS, COLORS } = WordleApp.Constants;
    const { keyH, keyGap, baseKeyW, keyboardStartY } = layout;

    // Clear previous frame's hitboxes
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
        const isUnavailable = /^[A-Z]$/.test(k) && !possibleLetters.has(k);

        // Color key based on revealed state or availability
        const state = keyStates[k];
        if (isUnavailable) {
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
        fill(isUnavailable ? COLORS.keyUnavailableText : COLORS.text);
        textSize((k.length > 1 ? 11 : 14) * layout.scale);
        textStyle(BOLD);
        text(k === "BACK" ? "⌫" : k, currX + keyW / 2, currY + keyH / 2);

        // Save hitbox for mouse/touch interactions
        keyButtons.push({
          key: k,
          x: currX,
          y: currY,
          w: keyW,
          h: keyH,
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

    const scale = layout.scale;
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(width / 2, 60 * scale, textWidth(message) + 30 * scale, 36 * scale, 6 * scale);

    fill(0);
    textSize(14 * scale);
    textStyle(BOLD);
    text(message, width / 2, 60 * scale);
    rectMode(CORNER);
  },

  /**
   * Main render loop method called on every p5 draw tick.
   */
  render() {
    const { COLORS } = WordleApp.Constants;
    const state = WordleApp.State;
    const layout = WordleApp.Layout.getLayout(width, height);

    background(COLORS.bg);

    this.drawHeader(layout, state.liveWords.length);
    this.drawGrid(layout, state.grid);
    this.drawKeyboard(layout, state.keyStates, state.possibleLetters, state.keyButtons);
    this.drawToast(layout, state.message, state.messageTimer);

    // Decrement toast frame counter
    state.tickToast();
  },
};
