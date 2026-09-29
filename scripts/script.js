/**
 * ============================================================================
 * Wordle Solver - Unified Script & Architecture Hub
 * ============================================================================
 *
 * This project has been restructured into clean, classified, professional modules:
 *
 * 📁 styles/
 *   └── style.css            - CSS custom properties, tokens, and responsive grid layout
 *
 * 📁 scripts/
 *   ├── vendor/
 *   │   └── p5.min.js        - 3rd party canvas rendering library
 *   ├── data/
 *   │   └── wordList.js      - Master dictionary of valid 5-letter English words
 *   ├── constants/
 *   │   └── constants.js     - Grid dimensions, keyboard layout, and RGB dark theme colors
 *   ├── state/
 *   │   └── gameState.js     - Board cell grid, cursor, remaining candidates, and toasts
 *   ├── engine/
 *   │   └── solver.js        - Two-pass Wordle evaluation & candidate filtering engine
 *   ├── ui/
 *   │   ├── layout.js        - Responsive canvas coordinate and scaling calculator
 *   │   ├── domManager.js    - DOM candidate list rendering, count badge, and smooth scrolling
 *   │   └── renderer.js      - p5 canvas drawing (animated grid, interactive keyboard, toasts)
 *   ├── input/
 *   │   └── inputHandler.js  - Keyboard & mouse interaction, tile cycling, guess submission
 *   └── main.js              - Application bootstrap and p5 lifecycle hook bindings
 *
 * ============================================================================
 */

// If modular scripts were loaded via index.html, delegate directly to WordleApp
if (typeof WordleApp !== "undefined" && WordleApp.Main) {
  // Modular architecture is actively running through scripts/main.js
} else {
  /* ========================================================================== */
  /* 1. CONSTANTS & CONFIGURATION                                               */
  /* ========================================================================== */

  /** Grid dimensions for standard 5x5 Wordle */
  const ROWS = 6;
  const COLS = 5;

  /** On-screen keyboard layout */
  const KB_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
  ];

  /** Dark theme color palette (RGB triplets) */
  const COLORS = {
    bg: [18, 18, 19],
    tileBorderEmpty: [58, 58, 60],
    tileBorderActive: [86, 87, 88],
    tileBg: [18, 18, 19],
    keyBg: [129, 131, 132],
    correct: [83, 141, 78],  // Green: exact match
    present: [181, 159, 59], // Yellow: misplaced letter
    absent: [58, 58, 60],    // Dark Gray: absent letter
    text: [255, 255, 255],
    keyUnavailableBg: [45, 45, 46],
    keyUnavailableText: [105, 105, 106],
  };

  /** Priority for keyboard key feedback coloration */
  const STATE_PRIORITY = { absent: 0, present: 1, correct: 2 };

  /** Tile evaluation state cycling order on user click: Green -> Blank/Gray -> Yellow -> Green */
  const TILE_STATES = ["correct", "absent", "present"];

  /* ========================================================================== */
  /* 2. GAME STATE                                                              */
  /* ========================================================================== */

  /** Grid state: 2D array of { letter: '', state: 'empty'|'absent'|'present'|'correct', flip: null } */
  let grid = [];
  let currentRow = 0;
  let currentCol = 0;
  let gameOver = false;

  /** Floating toast message state */
  let message = "";
  let messageTimer = 0;

  /** Candidate word lists */
  let remainingWords = typeof WORD_LIST !== "undefined" ? [...WORD_LIST] : [];
  let liveWords = [...remainingWords];
  let possibleLetters = new Set();

  /** Keyboard state & hitboxes */
  let keyStates = {};
  let keyButtons = [];

  /** Cached DOM elements */
  let candidateListElement;
  let candidateCountElement;

  /* ========================================================================== */
  /* 3. LIFECYCLE HOOKS (p5.js)                                                 */
  /* ========================================================================== */

  /**
   * Initializes the application, p5 canvas, and event listeners.
   */
  function setup() {
    createCanvas(Math.min(windowWidth, 800), windowHeight).parent("game");
    rectMode(CORNER);
    textAlign(CENTER, CENTER);

    candidateListElement = document.getElementById("candidate-list");
    candidateCountElement = document.getElementById("candidate-count");

    const heading = document.getElementById("candidate-heading");
    if (heading) {
      heading.addEventListener("click", scrollToCandidates);
    }

    if (candidateListElement) {
      candidateListElement.addEventListener("click", (event) => {
        const item = event.target.closest(".candidate-word");
        if (item) selectCandidate(item.textContent.trim());
      });
    }

    // Initialize 5x5 empty grid
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = { letter: "", state: "empty", flip: null };
      }
    }

    refreshLiveCandidates();
  }

  /**
   * Adjusts canvas size when browser window is resized.
   */
  function windowResized() {
    resizeCanvas(Math.min(windowWidth, 800), windowHeight);
  }

  /**
   * Main p5 animation frame loop.
   */
  function draw() {
    background(COLORS.bg);
    drawHeader();
    drawGrid();
    drawKeyboard();
    drawToast();
  }

  /* ========================================================================== */
  /* 4. LAYOUT & RENDERING                                                      */
  /* ========================================================================== */

  /**
   * Computes responsive layout dimensions based on canvas size.
   * @returns {Object} Layout metrics.
   */
  function getLayout() {
    const scale = Math.min(1, Math.max(0.2, (height - 40) / 520));
    const tileGap = 6 * scale;
    const tileSize = Math.min(52 * scale, (width - 32 - 4 * tileGap) / COLS);
    const keyGap = 6 * scale;
    const baseKeyW = Math.min(38 * scale, (width - 24 - 9 * keyGap) / 10);
    const keyH = 54 * scale;
    const keyboardHeight = KB_ROWS.length * keyH + (KB_ROWS.length - 1) * keyGap;

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
  }

  /**
   * Smoothly scrolls to the candidate recommendations section.
   */
  function scrollToCandidates() {
    const section = document.getElementById("candidate-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  }

  /**
   * Draws the canvas top header bar.
   */
  function drawHeader() {
    const scale = getLayout().scale;
    stroke(58, 58, 60);
    strokeWeight(1);
    line(0, 50 * scale, width, 50 * scale);

    noStroke();
    fill(COLORS.text);
    textSize(20 * scale);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text("WORDLE SOLVER", 16, 25 * scale);
    textAlign(RIGHT, CENTER);
    text(`${liveWords.length} LEFT`, width - 16, 25 * scale);
    textAlign(CENTER, CENTER);
  }

  /**
   * Draws the board tiles, letters, and 3D vertical flip animations.
   */
  function drawGrid() {
    const layout = getLayout();
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

        if (cell.flip) {
          const progress = Math.min(1, (millis() - cell.flip.startedAt) / 420);
          flipScale = Math.max(0.04, Math.abs(Math.cos(progress * Math.PI)));
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

        // Background & border color based on evaluation state
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

        // Letter text
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
  }

  /**
   * Draws the on-screen keyboard, dims unavailable keys, and records hitboxes.
   */
  function drawKeyboard() {
    keyButtons = [];
    const layout = getLayout();
    const { keyH, keyGap, baseKeyW, keyboardStartY } = layout;

    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      let totalRowW = 0;

      for (let k of row) {
        totalRowW += (k === "ENTER" || k === "BACK" ? baseKeyW * 1.5 : baseKeyW) + keyGap;
      }
      totalRowW -= keyGap;

      let currX = (width - totalRowW) / 2;
      const currY = keyboardStartY + r * (keyH + keyGap);

      for (let k of row) {
        const keyW = k === "ENTER" || k === "BACK" ? baseKeyW * 1.5 : baseKeyW;
        const isUnavailable = /^[A-Z]$/.test(k) && !possibleLetters.has(k);

        const state = keyStates[k];
        if (isUnavailable) fill(COLORS.keyUnavailableBg);
        else if (state === "correct") fill(COLORS.correct);
        else if (state === "present") fill(COLORS.present);
        else if (state === "absent") fill(COLORS.absent);
        else fill(COLORS.keyBg);

        noStroke();
        rect(currX, currY, keyW, keyH, 4);

        // Key label
        fill(isUnavailable ? COLORS.keyUnavailableText : COLORS.text);
        textSize((k.length > 1 ? 11 : 14) * layout.scale);
        textStyle(BOLD);
        text(k === "BACK" ? "⌫" : k, currX + keyW / 2, currY + keyH / 2);

        keyButtons.push({ key: k, x: currX, y: currY, w: keyW, h: keyH });
        currX += keyW + keyGap;
      }
    }
  }

  /**
   * Draws toast notifications.
   */
  function drawToast() {
    if (messageTimer > 0) {
      messageTimer--;
      const scale = getLayout().scale;
      fill(255);
      noStroke();
      rectMode(CENTER);
      rect(width / 2, 60 * scale, textWidth(message) + 30 * scale, 36 * scale, 6 * scale);
      fill(0);
      textSize(14 * scale);
      textStyle(BOLD);
      text(message, width / 2, 60 * scale);
      rectMode(CORNER);
    }
  }

  /**
   * Displays a toast banner.
   * @param {string} msg
   */
  function showToast(msg) {
    message = msg;
    messageTimer = 120;
  }

  /* ========================================================================== */
  /* 5. SOLVER ENGINE & CONSTRAINT EVALUATION                                   */
  /* ========================================================================== */

  /**
   * Evaluates a guess against a candidate word using Wordle's 2-pass algorithm.
   * @param {string} guess - 5-letter guess word.
   * @param {string} candidate - 5-letter candidate word.
   * @returns {string[]} Array of states ('correct' | 'present' | 'absent').
   */
  function evaluateGuess(guess, candidate) {
    const result = Array(COLS).fill("absent");
    const remaining = candidate.split("");

    // Pass 1: Mark exact matches
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === candidate[i]) {
        result[i] = "correct";
        remaining[i] = null;
      }
    }

    // Pass 2: Mark misplaced matches
    for (let i = 0; i < COLS; i++) {
      if (result[i] === "correct") continue;
      const targetIndex = remaining.indexOf(guess[i]);
      if (targetIndex !== -1) {
        result[i] = "present";
        remaining[targetIndex] = null;
      }
    }

    return result;
  }

  /**
   * Computes the set of characters available for the next keystroke in the active row.
   */
  function updatePossibleLetters() {
    possibleLetters = new Set();

    if (gameOver || currentRow >= ROWS) {
      return;
    }

    if (currentCol >= COLS) {
      return;
    }

    const col = currentCol;
    for (let i = 0; i < liveWords.length; i++) {
      const word = liveWords[i];
      if (word && word.length > col) {
        possibleLetters.add(word[col]);
      }
    }
  }

  /**
   * Dynamically filters candidate words based on the current row's letters & colors.
   */
  function refreshLiveCandidates() {
    if (currentRow >= ROWS || gameOver) {
      liveWords = [...remainingWords];
    } else {
      const row = grid[currentRow];
      const typedCells = row
        .map((cell, index) => ({ ...cell, index }))
        .filter((cell) => cell.letter);

      const completeFeedback =
        row.length === COLS &&
        row.every(
          (cell) => cell.letter && ["correct", "present", "absent"].includes(cell.state),
        );
      const guess = row.map((cell) => cell.letter).join("");
      const coloredCells = typedCells.filter((cell) => cell.state !== "empty");

      if (completeFeedback) {
        liveWords = remainingWords.filter((candidate) =>
          evaluateGuess(guess, candidate).every(
            (state, index) => state === row[index].state,
          ),
        );
      } else if (coloredCells.length > 0) {
        const minimumCounts = {};
        const maximumCounts = {};
        const hasAbsent = new Set();

        for (const cell of coloredCells) {
          if (cell.state !== "absent") {
            minimumCounts[cell.letter] = (minimumCounts[cell.letter] || 0) + 1;
          } else {
            hasAbsent.add(cell.letter);
          }
        }

        for (const letter of hasAbsent) {
          maximumCounts[letter] = minimumCounts[letter] || 0;
        }

        const uncoloredPrefix =
          currentCol < COLS
            ? typedCells.filter(
              (cell) => cell.state === "empty" && cell.index < currentCol,
            )
            : [];

        liveWords = remainingWords.filter((candidate) => {
          for (const cell of coloredCells) {
            if (cell.state === "correct") {
              if (candidate[cell.index] !== cell.letter) return false;
            } else if (cell.state === "present" || cell.state === "absent") {
              if (candidate[cell.index] === cell.letter) return false;
            }
          }

          for (const cell of uncoloredPrefix) {
            if (candidate[cell.index] !== cell.letter) return false;
          }

          const counts = {};
          for (const letter of candidate) counts[letter] = (counts[letter] || 0) + 1;
          for (const [letter, count] of Object.entries(minimumCounts)) {
            if ((counts[letter] || 0) < count) return false;
          }
          for (const [letter, count] of Object.entries(maximumCounts)) {
            if ((counts[letter] || 0) > count) return false;
          }
          return true;
        });
      } else {
        const prefix = row
          .slice(0, currentCol)
          .map((cell) => cell.letter)
          .join("");

        if (prefix.length > 0) {
          liveWords = remainingWords.filter((candidate) => candidate.startsWith(prefix));
        } else {
          liveWords = [...remainingWords];
        }
      }
    }

    updatePossibleLetters();

    if (candidateCountElement) {
      candidateCountElement.textContent = `${liveWords.length} words`;
    }

    if (candidateListElement) {
      const fragment = document.createDocumentFragment();
      for (const word of liveWords) {
        const item = document.createElement("div");
        item.className = "candidate-word";
        item.setAttribute("role", "listitem");
        item.textContent = word;
        fragment.appendChild(item);
      }
      candidateListElement.replaceChildren(fragment);
    }
  }

  /**
   * Re-evaluates valid candidate words against all locked rows up to currentRow.
   */
  function rebuildRemainingWords() {
    const wordList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];
    remainingWords = wordList.filter((candidate) => {
      for (let rowIndex = 0; rowIndex < currentRow; rowIndex++) {
        const row = grid[rowIndex];
        if (!isRowReady(row)) return false;
        const guess = row.map((cell) => cell.letter).join("");
        const feedback = row.map((cell) => cell.state);
        if (!evaluateGuess(guess, candidate).every((state, index) => state === feedback[index])) {
          return false;
        }
      }
      return true;
    });

    keyStates = {};
    for (let rowIndex = 0; rowIndex < currentRow; rowIndex++) {
      for (const cell of grid[rowIndex]) {
        if (
          keyStates[cell.letter] === undefined ||
          STATE_PRIORITY[cell.state] > STATE_PRIORITY[keyStates[cell.letter]]
        ) {
          keyStates[cell.letter] = cell.state;
        }
      }
    }
    refreshLiveCandidates();
  }

  /* ========================================================================== */
  /* 6. INPUT PROCESSING & ACTIONS                                              */
  /* ========================================================================== */

  /**
   * Handles user input from physical or on-screen keyboard.
   * @param {string} keyVal
   */
  function handleInput(keyVal) {
    if (keyVal === "BACK" || keyVal === "BACKSPACE") {
      gameOver = false;
      if (message && message.startsWith("Solved:")) {
        message = "";
        messageTimer = 0;
      }
      if (currentCol > 0) {
        currentCol--;
        grid[currentRow][currentCol].letter = "";
        grid[currentRow][currentCol].state = "empty";
        grid[currentRow][currentCol].flip = null;
        refreshLiveCandidates();
      } else if (currentRow > 0) {
        activateRow(currentRow - 1);
        currentCol = COLS;
        if (currentCol > 0) {
          currentCol--;
          grid[currentRow][currentCol].letter = "";
          grid[currentRow][currentCol].state = "empty";
          grid[currentRow][currentCol].flip = null;
        }
        refreshLiveCandidates();
      }
      return;
    }

    if (gameOver) return;
      if (isRowReady(grid[currentRow])) {
        submitGuess();
      } else {
        showToast("Fill and color the row first");
      }
    } else if (/^[A-Z]$/.test(keyVal)) {
      if (!possibleLetters.has(keyVal)) return;
      if (currentCol === COLS && isRowReady(grid[currentRow])) {
        if (!submitGuess(false)) return;
        if (gameOver) return;
      }
      if (currentCol < COLS) {
        grid[currentRow][currentCol].letter = keyVal;
        grid[currentRow][currentCol].state = "empty";
        currentCol++;
        refreshLiveCandidates();
      }
    }
  }

  /**
   * Checks if all cells in a row have letters and colors assigned.
   * @param {Array<Object>} row
   * @returns {boolean}
   */
  function isRowReady(row) {
    return row.every(
      (cell) => cell.letter && ["correct", "present", "absent"].includes(cell.state),
    );
  }

  /**
   * Activates a row for editing and resets all rows below it.
   * @param {number} rowIndex
   */
  function activateRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= ROWS || rowIndex > currentRow) return;
    currentRow = rowIndex;
    currentCol = grid[rowIndex].findIndex((cell) => !cell.letter);
    if (currentCol === -1) currentCol = COLS;

    for (let row = rowIndex + 1; row < ROWS; row++) {
      grid[row] = Array.from({ length: COLS }, () => ({ letter: "", state: "empty" }));
    }
    rebuildRemainingWords();
  }

  /**
   * Populates the active row with a selected candidate word.
   * @param {string} word
   */
  function selectCandidate(word) {
    if (gameOver) return;
    if (isRowReady(grid[currentRow])) {
      if (!submitGuess(false)) return;
    }
    if (gameOver) return;
    if (currentRow >= ROWS) return;

    grid[currentRow] = word.split("").map((letter) => ({ letter, state: "empty" }));
    currentCol = COLS;
    refreshLiveCandidates();
  }

  /**
   * Submits the current row's guess and feedback colors.
   * @param {boolean} [showCandidates=true]
   * @returns {boolean}
   */
  function submitGuess(showCandidates = true) {
    const row = grid[currentRow];
    const guess = row.map((cell) => cell.letter).join("");
    const feedback = row.map((cell) => cell.state);
    const wordList = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];

    if (!wordList.includes(guess)) {
      showToast("Not in word list");
      return false;
    }

    if (!isRowReady(row)) {
      showToast("Fill and color the row first");
      return false;
    }

    const filteredWords = remainingWords.filter((candidate) =>
      evaluateGuess(guess, candidate).every((state, index) => state === feedback[index]),
    );

    if (filteredWords.length === 0) {
      showToast("No matches. Check tile colors");
      return false;
    }

    remainingWords = filteredWords;
    for (let i = 0; i < COLS; i++) {
      const letter = guess[i];
      const state = feedback[i];
      if (
        keyStates[letter] === undefined ||
        STATE_PRIORITY[state] > STATE_PRIORITY[keyStates[letter]]
      ) {
        keyStates[letter] = state;
      }
    }

    currentRow++;
    currentCol = 0;
    refreshLiveCandidates();

    if (feedback.every((state) => state === "correct")) {
      showToast("Solved");
      gameOver = true;
      if (showCandidates) scrollToCandidates();
      return true;
    }

    if (currentRow === ROWS) {
      showToast("No guesses left");
      gameOver = true;
    } else if (showCandidates) {
      showToast(`${remainingWords.length} possible words`);
      scrollToCandidates();
    }
    return true;
  }

  /**
   * Physical keyboard event listener.
   */
  function keyPressed() {
    if (key === "Enter" || keyCode === 13) {
      handleInput("ENTER");
      return false;
    } else if (key === "Backspace" || keyCode === 8) {
      handleInput("BACK");
      return false;
    } else if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
      handleInput(key.toUpperCase());
    }
  }

  /**
   * Mouse and touch click handler.
   */
  function mousePressed() {
    if (mouseY <= 50 * getLayout().scale && mouseX >= width - 160) {
      scrollToCandidates();
      return;
    }
    const layout = getLayout();
    const { tileSize, tileGap } = layout;
    const startX = (width - (COLS * tileSize + (COLS - 1) * tileGap)) / 2;
    const startY = layout.gridStartY;

    // Check tile click
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
          if (r > currentRow) return;
          if (r !== currentRow) activateRow(r);
          const cell = grid[r][c];
          if (!cell.letter) return;

          gameOver = false;
          if (message && message.startsWith("Solved:")) {
            message = "";
            messageTimer = 0;
          }

          let currIdx = TILE_STATES.indexOf(cell.state);
          const nextState = currIdx === -1 ? TILE_STATES[0] : TILE_STATES[(currIdx + 1) % TILE_STATES.length];
          cell.flip = { from: cell.state, to: nextState, startedAt: millis() };
          cell.state = nextState;
          refreshLiveCandidates();
          return;
        }
      }
    }

    // Check keyboard click
    for (let btn of keyButtons) {
      if (
        mouseX >= btn.x &&
        mouseX <= btn.x + btn.w &&
        mouseY >= btn.y &&
        mouseY <= btn.y + btn.h
      ) {
        if (gameOver && btn.key !== "BACK") return;
        handleInput(btn.key);
        return;
      }
    }
  }
}