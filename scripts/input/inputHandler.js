/**
 * ============================================================================
 * WordleHelper - Input & Interaction Handler
 * ============================================================================
 * Manages physical and virtual keyboard input, continuous multi-row typing
 * without Enter key, tile color cycling (Green -> Absent/Blank -> Yellow -> Green), and candidate selection.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.InputHandler = {
  /**
   * Processes a single input key command.
   *
   * @param {string} keyVal - Key identifier ("BACK", single letter A-Z, etc.).
   */
  handleInput(keyVal) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    // Enter key is explicitly disabled
    if (keyVal === "ENTER") {
      return;
    }

    // Handle Backspace / Delete (always allowed, even when row is filled with 5 green blocks or solved)
    if (keyVal === "BACK" || keyVal === "BACKSPACE") {
      state.gameOver = false;
      if (state.message && state.message.startsWith("Solved:")) {
        state.message = "";
        state.messageTimer = 0;
      }

      if (state.currentCol > 0) {
        state.currentCol--;
        state.grid[state.currentRow][state.currentCol].letter = "";
        state.grid[state.currentRow][state.currentCol].state = "empty";
        state.grid[state.currentRow][state.currentCol].flip = null;
        WordleApp.Solver.refreshLiveCandidates();
      } else if (state.currentRow > 0) {
        this.activateRow(state.currentRow - 1);
        state.currentCol = COLS;
        // Delete the last letter of the activated row on backspace
        if (state.currentCol > 0) {
          state.currentCol--;
          state.grid[state.currentRow][state.currentCol].letter = "";
          state.grid[state.currentRow][state.currentCol].state = "empty";
          state.grid[state.currentRow][state.currentCol].flip = null;
        }
        WordleApp.Solver.refreshLiveCandidates();
      }
      return;
    }

    if (state.gameOver) return;

    // Handle Alphabetical Letters (A-Z)
    if (/^[A-Z]$/.test(keyVal)) {
      // Case 1: Current row is full, but user continues typing for the next row
      if (state.currentCol === COLS) {
        if (state.currentRow < ROWS - 1 && state.liveWords.length > 1) {
          if (!state.possibleLetters.has(keyVal)) return;

          // Commit current row's feedback into confirmed state
          this.commitRow(state.currentRow);

          // Advance to next row
          state.currentRow++;
          state.currentCol = 0;

          // Place initial letter in Green
          state.grid[state.currentRow][0].letter = keyVal;
          state.grid[state.currentRow][0].state = "correct";
          state.grid[state.currentRow][0].flip = null;
          state.currentCol = 1;

          WordleApp.Solver.refreshLiveCandidates();
        } else if (state.liveWords.length === 1) {
          state.showToast(`Solved: ${state.liveWords[0]}`);
          state.gameOver = true;
        }
        return;
      }

      // Case 2: Typing within current row
      if (state.currentCol < COLS) {
        if (!state.possibleLetters.has(keyVal)) return;

        // Default fill block with Green (correct)
        state.grid[state.currentRow][state.currentCol].letter = keyVal;
        state.grid[state.currentRow][state.currentCol].state = "correct";
        state.grid[state.currentRow][state.currentCol].flip = null;
        state.currentCol++;

        WordleApp.Solver.refreshLiveCandidates();

        // Check if only 1 candidate left after completing word
        if (state.currentCol === COLS) {
          if (state.liveWords.length === 1) {
            state.showToast(`Solved: ${state.liveWords[0]}`);
            state.gameOver = true;
          } else if (state.liveWords.length === 0) {
            state.showToast("No matches. Check tile colors");
          }
        }
      }
    }
  },

  /**
   * Commits a completed row into confirmed solver constraints and updates key colors.
   *
   * @param {number} rowIndex - Row index to lock.
   */
  commitRow(rowIndex) {
    const state = WordleApp.State;
    const { COLS } = WordleApp.Constants.GRID;
    const row = state.grid[rowIndex];
    const priority = WordleApp.Constants.STATE_PRIORITY;

    // Update remainingWords to current liveWords
    state.remainingWords = [...state.liveWords];

    // Update keyboard key colors
    for (let c = 0; c < COLS; c++) {
      const cell = row[c];
      if (cell.letter && cell.state !== "empty") {
        if (
          state.keyStates[cell.letter] === undefined ||
          priority[cell.state] > priority[state.keyStates[cell.letter]]
        ) {
          state.keyStates[cell.letter] = cell.state;
        }
      }
    }
  },

  /**
   * Validates whether a row has all 5 letters filled.
   *
   * @param {Array<Object>} row - Row of cells.
   * @returns {boolean} True if all columns contain letters.
   */
  isRowComplete(row) {
    return row.every((cell) => Boolean(cell.letter));
  },

  /**
   * Activates a previous row for editing and resets rows below it.
   *
   * @param {number} rowIndex - Index of row to activate.
   */
  activateRow(rowIndex) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (rowIndex < 0 || rowIndex >= ROWS) return;

    state.currentRow = rowIndex;
    state.currentCol = state.grid[rowIndex].findIndex((cell) => !cell.letter);
    if (state.currentCol === -1) {
      state.currentCol = COLS;
    }
    state.gameOver = false;

    // Reset subsequent rows below activated row
    for (let r = rowIndex + 1; r < ROWS; r++) {
      state.grid[r] = Array.from({ length: COLS }, () => ({
        letter: "",
        state: "empty",
        flip: null,
      }));
    }

    WordleApp.Solver.rebuildRemainingWords();
  },

  /**
   * Populates the current row with a candidate word from the suggestions list.
   *
   * @param {string} word - 5-letter candidate word.
   */
  selectCandidate(word) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (state.gameOver) return;

    // If current row already has 5 letters and candidates remain, advance row first
    if (state.currentCol === COLS && state.currentRow < ROWS - 1 && state.liveWords.length > 1) {
      this.commitRow(state.currentRow);
      state.currentRow++;
      state.currentCol = 0;
    }

    if (state.currentRow >= ROWS) return;

    // Fill row with letters and default to Green
    state.grid[state.currentRow] = word.split("").map((letter) => ({
      letter,
      state: "correct",
      flip: null,
    }));
    state.currentCol = COLS;

    WordleApp.Solver.refreshLiveCandidates();

    if (state.liveWords.length === 1) {
      state.showToast(`Solved: ${state.liveWords[0]}`);
      state.gameOver = true;
    }
  },

  /**
   * Handles canvas click interactions (tile cycling, keyboard presses).
   *
   * @param {number} mouseX - Mouse X on canvas.
   * @param {number} mouseY - Mouse Y on canvas.
   */
  handleCanvasClick(mouseX, mouseY) {
    const state = WordleApp.State;
    const layout = WordleApp.Layout.getLayout(width, height);
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    const { tileSize, tileGap } = layout;

    const startX = (width - (COLS * tileSize + (COLS - 1) * tileGap)) / 2;
    const startY = layout.gridStartY;

    // 1. Check if a board tile was clicked (cycle color including blank)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = startX + c * (tileSize + tileGap);
        const y = startY + r * (tileSize + tileGap);

        if (
          mouseX >= x &&
          mouseX <= x + tileSize &&
          mouseY >= y &&
          mouseY <= y + tileSize
        ) {
          if (r > state.currentRow) return;

          // Allow switching active row by clicking on it
          if (r !== state.currentRow) {
            this.activateRow(r);
          }

          const cell = state.grid[r][c];
          if (!cell.letter) return;

          // Reset gameOver and solved notification when user cycles tile feedback
          state.gameOver = false;
          if (state.message && state.message.startsWith("Solved:")) {
            state.message = "";
            state.messageTimer = 0;
          }

          // Cycle tile states: correct (green) -> absent (blank/gray) -> present (yellow) -> correct (green)
          const states = WordleApp.Constants.TILE_STATES;
          let currIdx = states.indexOf(cell.state);
          const nextState = currIdx === -1 ? states[0] : states[(currIdx + 1) % states.length];

          cell.flip = {
            from: cell.state,
            to: nextState,
            startedAt: millis(),
          };
          cell.state = nextState;

          WordleApp.Solver.refreshLiveCandidates();
          return;
        }
      }
    }

    // 2. Check if an on-screen keyboard button was clicked
    for (let i = 0; i < state.keyButtons.length; i++) {
      const btn = state.keyButtons[i];
      if (
        mouseX >= btn.x &&
        mouseX <= btn.x + btn.w &&
        mouseY >= btn.y &&
        mouseY <= btn.y + btn.h
      ) {
        // Disabled keys (like ENTER or unavailable letters) do nothing
        if (btn.disabled) return;
        // When game is over/solved, only allow the BACK button so user can back
        if (state.gameOver && btn.key !== "BACK") return;
        this.handleInput(btn.key);
        return;
      }
    }
  },

  /**
   * Handles physical keyboard key presses.
   *
   * @param {string} key - Pressed key string.
   * @param {number} keyCode - Numeric key code.
   * @returns {boolean} Returns false to prevent browser default scrolling.
   */
  handlePhysicalKey(key, keyCode) {
    if (key === "Enter" || keyCode === 13) {
      // Enter key is explicitly disabled
      return false;
    }

    if (key === "Backspace" || keyCode === 8) {
      this.handleInput("BACK");
      return false;
    }

    if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
      this.handleInput(key.toUpperCase());
    }
  },
};
