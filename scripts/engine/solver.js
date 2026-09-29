/**
 * ============================================================================
 * Wordle Solver - Constraint & Guess Evaluation Engine
 * ============================================================================
 * Encapsulates the core solver algorithms:
 * 1. Two-pass Wordle guess evaluation (correct, present, absent).
 * 2. Letter frequency constraint analysis.
 * 3. Dynamic candidate word filtering against partial and full feedback.
 * 4. Active letter set computation for keyboard key availability.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Solver = {
  /**
   * Evaluates a guess against a target word candidate following standard Wordle rules.
   *
   * Two-pass algorithm:
   * 1. Pass 1: Mark exact position matches as 'correct' (green).
   * 2. Pass 2: Mark remaining matching letters as 'present' (yellow).
   *
   * @param {string} guess - The 5-letter guessed word.
   * @param {string} candidate - The target 5-letter candidate word.
   * @returns {string[]} Array of states ('correct' | 'present' | 'absent') for each column.
   */
  evaluateGuess(guess, candidate) {
    const { COLS } = WordleApp.Constants.GRID;
    const result = Array(COLS).fill("absent");
    const remaining = candidate.split("");

    // Pass 1: Mark exact matches
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === candidate[i]) {
        result[i] = "correct";
        remaining[i] = null;
      }
    }

    // Pass 2: Mark letters present in wrong positions
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
   * When typing in the current row, only letters that can legally be the next letter
   * (at state.currentCol) to continue a candidate word from state.liveWords are enabled.
   * If all columns are filled or the game has ended, all letter keys are disabled.
   */
  updatePossibleLetters() {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;
    state.possibleLetters = new Set();

    if (state.gameOver || state.currentRow >= ROWS) {
      return;
    }

    When the current row is full (all 5 letters entered), no more letters can be typed
    if (state.currentCol >= COLS) {
      return;
    // }

    // Only allow letters that can appear at the current cursor position (state.currentCol)
    // for candidate words in state.liveWords
    const col = state.currentCol;
    for (let i = 0; i < state.liveWords.length; i++) {
      const word = state.liveWords[i];
      if (word && word.length > col) {
        state.possibleLetters.add(word[col]);
      }
    }
  },

  /**
   * Filters the remaining candidate words based on the current row's letters
   * and any colored states assigned by the user.
   * Restricts suggestions immediately to words beginning with the typed sequence.
   * Updates state.liveWords, state.possibleLetters, and syncs the DOM display.
   */
  refreshLiveCandidates() {
    const state = WordleApp.State;
    const { ROWS, COLS } = WordleApp.Constants.GRID;

    if (state.currentRow >= ROWS || state.gameOver) {
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
        // Complete row feedback provided: use exact Wordle feedback evaluation
        state.liveWords = state.remainingWords.filter((candidate) =>
          this.evaluateGuess(guess, candidate).every(
            (cellState, index) => cellState === row[index].state
          )
        );
      } else if (coloredCells.length > 0) {
        // Active feedback coloring mode: user is coloring tiles in this row
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

        // Uncolored prefix cells if typing with partial colors
        const uncoloredPrefix =
          state.currentCol < COLS
            ? typedCells.filter(
                (cell) => cell.state === "empty" && cell.index < state.currentCol
              )
            : [];

        state.liveWords = state.remainingWords.filter((candidate) => {
          // Positional constraints for colored cells
          for (let i = 0; i < coloredCells.length; i++) {
            const cell = coloredCells[i];
            if (cell.state === "correct") {
              if (candidate[cell.index] !== cell.letter) return false;
            } else if (cell.state === "present" || cell.state === "absent") {
              if (candidate[cell.index] === cell.letter) return false;
            }
          }

          // Positional constraints for uncolored prefix cells
          for (let i = 0; i < uncoloredPrefix.length; i++) {
            const cell = uncoloredPrefix[i];
            if (candidate[cell.index] !== cell.letter) return false;
          }

          // Letter count constraints
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
        // Typing mode (no colored tiles yet in the current row):
        // Immediately restrict to only words that begin with the exact typed sequence
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

    this.updatePossibleLetters();
    WordleApp.DOMManager.updateCandidateList(state.liveWords);
  },

  /**
   * Rebuilds the candidate words list against all previously completed and locked rows.
   * Reconstructs keyboard key states with appropriate priority.
   */
  rebuildRemainingWords() {
    const state = WordleApp.State;
    const wordList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];

    state.remainingWords = wordList.filter((candidate) => {
      for (let rowIndex = 0; rowIndex < state.currentRow; rowIndex++) {
        const row = state.grid[rowIndex];
        if (!WordleApp.InputHandler.isRowReady(row)) return false;
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
        if (
          state.keyStates[cell.letter] === undefined ||
          priority[cell.state] > priority[state.keyStates[cell.letter]]
        ) {
          state.keyStates[cell.letter] = cell.state;
        }
      }
    }

    this.refreshLiveCandidates();
  },
};
