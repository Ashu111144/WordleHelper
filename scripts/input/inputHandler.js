/**
 * ============================================================================
 * Wordle Solver - Input & Interaction Handler
 * ============================================================================
 * Manages physical keyboard input, on-screen keyboard button clicks,
 * tile state toggling (with flip animation), and candidate word selections.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.InputHandler = {
  /**
   * Processes a single input key command ("ENTER", "BACK", or a single letter A-Z).
   *
   * @param {string} keyVal - Key identifier.
   */
  handleInput(keyVal) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (state.gameOver) return;

    // Handle Backspace / Delete
    if (keyVal === "BACK" || keyVal === "BACKSPACE") {
      if (state.currentCol > 0) {
        state.currentCol--;
        state.grid[state.currentRow][state.currentCol].letter = "";
        state.grid[state.currentRow][state.currentCol].state = "empty";
        state.grid[state.currentRow][state.currentCol].flip = null;
        WordleApp.Solver.refreshLiveCandidates();
      } else if (state.currentRow > 0) {
        this.activateRow(state.currentRow - 1);
        state.currentCol = COLS;
      }
      return;
    }

    // Handle Enter / Submission
    if (keyVal === "ENTER") {
      if (this.isRowReady(state.grid[state.currentRow])) {
        this.submitGuess();
      } else {
        state.showToast("Fill and color the row first");
      }
      return;
    }

    // Handle Alphabetical Letters (A-Z)
    if (/^[A-Z]$/.test(keyVal)) {
      if (!state.possibleLetters.has(keyVal)) return;

      // If the row is full and ready, automatically attempt submission before continuing
      if (state.currentCol === COLS && this.isRowReady(state.grid[state.currentRow])) {
        if (!this.submitGuess(false)) return;
        if (state.gameOver) return;
      }

      if (state.currentCol < COLS) {
        state.grid[state.currentRow][state.currentCol].letter = keyVal;
        state.grid[state.currentRow][state.currentCol].state = "empty";
        state.currentCol++;
        WordleApp.Solver.refreshLiveCandidates();
      }
    }
  },

  /**
   * Validates whether a row has all 5 letters and each tile is colored (not empty).
   *
   * @param {Array<Object>} row - Row of 5 grid cell objects.
   * @returns {boolean} True if row is complete and colored.
   */
  isRowReady(row) {
    return row.every(
      (cell) => cell.letter && ["correct", "present", "absent"].includes(cell.state)
    );
  },

  /**
   * Activates a previous row for editing and resets all rows below it.
   *
   * @param {number} rowIndex - Index of the row to activate.
   */
  activateRow(rowIndex) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (rowIndex < 0 || rowIndex >= ROWS || rowIndex > state.currentRow) return;

    state.currentRow = rowIndex;
    state.currentCol = state.grid[rowIndex].findIndex((cell) => !cell.letter);
    if (state.currentCol === -1) {
      state.currentCol = COLS;
    }

    // Clear and reset subsequent rows
    for (let r = rowIndex + 1; r < ROWS; r++) {
      state.grid[r] = Array.from({ length: COLS }, () => ({
        letter: "",
        state: "empty",
      }));
    }

    WordleApp.Solver.rebuildRemainingWords();
  },

  /**
   * Automatically populates the current active row with a selected candidate word.
   *
   * @param {string} word - Selected 5-letter candidate word.
   */
  selectCandidate(word) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (state.gameOver) return;

    // If current row is already filled and colored, submit it first
    if (this.isRowReady(state.grid[state.currentRow])) {
      if (!this.submitGuess(false)) return;
    }

    if (state.gameOver) return;
    if (state.currentRow >= ROWS) return;

    state.grid[state.currentRow] = word.split("").map((letter) => ({
      letter,
      state: "empty",
    }));
    state.currentCol = COLS;

    WordleApp.Solver.refreshLiveCandidates();
  },

  /**
   * Validates and submits the guess in the current row.
   *
   * @param {boolean} [showCandidates=true] - Whether to show remaining candidates and auto-scroll.
   * @returns {boolean} True if submission was successful.
   */
  submitGuess(showCandidates = true) {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    const wordList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];

    const row = state.grid[state.currentRow];
    const guess = row.map((cell) => cell.letter).join("");
    const feedback = row.map((cell) => cell.state);

    if (!wordList.includes(guess)) {
      state.showToast("Not in word list");
      return false;
    }

    if (!this.isRowReady(row)) {
      state.showToast("Fill and color the row first");
      return false;
    }

    const filteredWords = state.remainingWords.filter((candidate) =>
      WordleApp.Solver.evaluateGuess(guess, candidate).every(
        (cellState, index) => cellState === feedback[index]
      )
    );

    if (filteredWords.length === 0) {
      state.showToast("No matches. Check tile colors");
      return false;
    }

    // Commit confirmed remaining words
    state.remainingWords = filteredWords;

    // Update keyboard key feedback states
    const priority = WordleApp.Constants.STATE_PRIORITY;
    for (let i = 0; i < COLS; i++) {
      const letter = guess[i];
      const cellFeedback = feedback[i];
      if (
        state.keyStates[letter] === undefined ||
        priority[cellFeedback] > priority[state.keyStates[letter]]
      ) {
        state.keyStates[letter] = cellFeedback;
      }
    }

    // Move to next row
    state.currentRow++;
    state.currentCol = 0;
    WordleApp.Solver.refreshLiveCandidates();

    // Check win condition (all green)
    if (feedback.every((cellState) => cellState === "correct")) {
      state.showToast("Solved");
      state.gameOver = true;
      if (showCandidates) {
        WordleApp.DOMManager.scrollToCandidates();
      }
      return true;
    }

    // Check out-of-guesses condition
    if (state.currentRow === ROWS) {
      state.showToast("No guesses left");
      state.gameOver = true;
    } else if (showCandidates) {
      state.showToast(`${state.remainingWords.length} possible words`);
      WordleApp.DOMManager.scrollToCandidates();
    }

    return true;
  },

  /**
   * Handles canvas mouse and touch click events.
   *
   * @param {number} mouseX - Mouse X coordinate on canvas.
   * @param {number} mouseY - Mouse Y coordinate on canvas.
   */
  handleCanvasClick(mouseX, mouseY) {
    const layout = WordleApp.Layout.getLayout(width, height);

    // Click on top-right candidate count in header scrolls to candidate section
    if (mouseY <= 50 * layout.scale && mouseX >= width - 160) {
      WordleApp.DOMManager.scrollToCandidates();
      return;
    }

    const state = WordleApp.State;
    if (state.gameOver) return;

    const { ROWS, COLS } = WordleApp.Constants.GRID;
    const { tileSize, tileGap } = layout;
    const startX = (width - (COLS * tileSize + (COLS - 1) * tileGap)) / 2;
    const startY = layout.gridStartY;

    // 1. Check if a board tile was clicked
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
          if (r !== state.currentRow) {
            this.activateRow(r);
          }

          const cell = state.grid[r][c];
          if (!cell.letter) return;

          // Cycle tile state: empty -> absent -> present -> correct -> empty
          const states = WordleApp.Constants.TILE_STATES;
          const nextState = states[(states.indexOf(cell.state) + 1) % states.length];

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
        this.handleInput(btn.key);
        return;
      }
    }
  },

  /**
   * Handles physical hardware keyboard key presses.
   *
   * @param {string} key - Pressed key string.
   * @param {number} keyCode - Numeric key code.
   * @returns {boolean|void} Returns false to prevent default browser behavior for Enter/Backspace.
   */
  handlePhysicalKey(key, keyCode) {
    if (key === "Enter" || keyCode === 13) {
      this.handleInput("ENTER");
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
