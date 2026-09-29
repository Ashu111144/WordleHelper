/**
 * ============================================================================
 * WordleHelper - Constraint & Candidate Evaluation Engine
 * ============================================================================
 * Evaluates board feedback against 5-letter candidate words using:
 * 1. Exact two-pass Wordle matching for complete rows.
 * 2. Positional and frequency constraints for partial feedback.
 * 3. Dynamic possible letters calculation to guide typing without Enter key.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Solver = {
  /**
   * Evaluates a guess against a target word candidate following standard Wordle rules.
   *
   * @param {string} guess - The 5-letter guessed word.
   * @param {string} candidate - The target 5-letter candidate word.
   * @returns {string[]} Array of states ('correct'|'present'|'absent') for each column.
   */
  evaluateGuess(guess, candidate) {
    const { COLS } = WordleApp.Constants.GRID;
    const result = Array(COLS).fill("absent");
    const remaining = candidate.split("");

    // Pass 1: Exact positional matches
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === candidate[i]) {
        result[i] = "correct";
        remaining[i] = null;
      }
    }

    // Pass 2: Present in wrong position
    for (let i = 0; i < COLS; i++) {
      if (result[i] === "correct") continue;
      const targetIndex = remaining.indexOf(guess[i]);
      if (targetIndex !== -1) {
        result[i] = "present";
        remaining[targetIndex] = null;
      }
    }

    return result;
  },

  /**
   * Updates state.possibleLetters to restrict keyboard input:
   * 1. While typing in current row (col < COLS): allows letters that can be next.
   * 2. When row is full (col === COLS): allows letters that can start the next row
   *    as long as more than one candidate remains (liveWords.length > 1).
   * 3. When only 1 candidate remains, further typing is halted.
   */
  updatePossibleLetters() {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    state.possibleLetters = new Set();

    if (state.gameOver || state.currentRow >= ROWS) {
      return;
    }

    if (state.currentCol < COLS) {
      // Only allow letters that can appear at the current column for remaining candidates
      const col = state.currentCol;
      for (let i = 0; i < state.liveWords.length; i++) {
        const word = state.liveWords[i];
        if (word && word.length > col) {
          state.possibleLetters.add(word[col]);
        }
      }
    } else if (state.currentCol === COLS) {
      // Current row is full. Allow starting letters for the next row if more than 1 candidate remains
      if (state.currentRow < ROWS - 1 && state.liveWords.length > 1) {
        for (let i = 0; i < state.liveWords.length; i++) {
          const word = state.liveWords[i];
          if (word && word.length > 0) {
            state.possibleLetters.add(word[0]);
          }
        }
      }
    }
  },

  /**
   * Filters the remaining candidate words based on confirmed rows and active row feedback.
   */
  refreshLiveCandidates() {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (state.currentRow >= ROWS) {
      state.liveWords = [...state.remainingWords];
    } else {
      const row = state.grid[state.currentRow];
      const typedCells = row
        .map((cell, index) => ({ ...cell, index }))
        .filter((cell) => cell.letter);

      const completeFeedback =
        row.length === COLS &&
        row.every(
          (cell) => cell.letter && ["correct", "present", "absent"].includes(cell.state)
        );
      const guess = row.map((cell) => cell.letter).join("");
      const coloredCells = typedCells.filter((cell) => cell.state !== "empty");

      if (completeFeedback) {
        // Complete row feedback provided
        state.liveWords = state.remainingWords.filter((candidate) =>
          this.evaluateGuess(guess, candidate).every(
            (cellState, index) => cellState === row[index].state
          )
        );
      } else if (coloredCells.length > 0) {
        // Partial feedback mode
        const minimumCounts = {};
        const maximumCounts = {};
        const hasAbsent = new Set();

        for (let i = 0; i < coloredCells.length; i++) {
          const cell = coloredCells[i];
          if (cell.state !== "absent") {
            minimumCounts[cell.letter] = (minimumCounts[cell.letter] || 0) + 1;
          } else {
            hasAbsent.add(cell.letter);
          }
        }

        for (const letter of hasAbsent) {
          maximumCounts[letter] = minimumCounts[letter] || 0;
        }

        state.liveWords = state.remainingWords.filter((candidate) => {
          // Positional constraints
          for (let i = 0; i < coloredCells.length; i++) {
            const cell = coloredCells[i];
            if (cell.state === "correct") {
              if (candidate[cell.index] !== cell.letter) return false;
            } else if (cell.state === "present" || cell.state === "absent") {
              if (candidate[cell.index] === cell.letter) return false;
            }
          }

          // Count constraints
          const counts = {};
          for (let i = 0; i < candidate.length; i++) {
            const letter = candidate[i];
            counts[letter] = (counts[letter] || 0) + 1;
          }

          for (const [letter, count] of Object.entries(minimumCounts)) {
            if ((counts[letter] || 0) < count) return false;
          }

          for (const [letter, count] of Object.entries(maximumCounts)) {
            if ((counts[letter] || 0) > count) return false;
          }

          return true;
        });
      } else {
        // All uncolored tiles: filter by prefix if any letters entered
        const prefix = row
          .slice(0, state.currentCol)
          .map((cell) => cell.letter)
          .join("");

        if (prefix.length > 0) {
          state.liveWords = state.remainingWords.filter((candidate) =>
            candidate.startsWith(prefix)
          );
        } else {
          state.liveWords = [...state.remainingWords];
        }
      }
    }

    if (state.currentCol < COLS || state.liveWords.length > 1) {
      state.gameOver = false;
    }

    this.updatePossibleLetters();

    if (WordleApp.DOMManager) {
      WordleApp.DOMManager.updateCandidateList(state.liveWords);
      WordleApp.DOMManager.updateHeaderBadge(state.liveWords.length);
    }
  },

  /**
   * Rebuilds candidate words against all previously locked rows.
   */
  rebuildRemainingWords() {
    const state = WordleApp.State;
    const wordList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];

    state.remainingWords = wordList.filter((candidate) => {
      for (let rowIndex = 0; rowIndex < state.currentRow; rowIndex++) {
        const row = state.grid[rowIndex];
        if (!WordleApp.InputHandler.isRowComplete(row)) return false;
        const guess = row.map((cell) => cell.letter).join("");
        const feedback = row.map((cell) => cell.state);
        if (!this.evaluateGuess(guess, candidate).every((s, i) => s === feedback[i])) {
          return false;
        }
      }
      return true;
    });

    // Reconstruct key state colors based on confirmed rows
    state.keyStates = {};
    const priority = WordleApp.Constants.STATE_PRIORITY;

    for (let rowIndex = 0; rowIndex < state.currentRow; rowIndex++) {
      for (let c = 0; c < state.grid[rowIndex].length; c++) {
        const cell = state.grid[rowIndex][c];
        if (cell.state !== "empty") {
          if (
            state.keyStates[cell.letter] === undefined ||
            priority[cell.state] > priority[state.keyStates[cell.letter]]
          ) {
            state.keyStates[cell.letter] = cell.state;
          }
        }
      }
    }

    this.refreshLiveCandidates();
  },
};
