/**
 * ============================================================================
 * WordleHelper - Application Entry Point & p5.js Lifecycle Coordinator
 * ============================================================================
 * Orchestrates application bootstrap, responsive canvas resizing, p5 event loops,
 * theme setup, and global p5 lifecycle hook bindings.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Main = {
  APP_BAR_HEIGHT: 50,

  /**
   * Initializes theme, canvas, state, and DOM event handlers.
   */
  init() {
    const canvasW = Math.min(windowWidth, 800);
    const canvasH = Math.max(320, windowHeight - this.APP_BAR_HEIGHT);

    // 1. Create responsive p5 canvas and attach to DOM container #game
    createCanvas(canvasW, canvasH).parent("game");
    rectMode(CORNER);
    textAlign(CENTER, CENTER);

    // 2. Initialize Theme System
    if (WordleApp.ThemeManager) {
      WordleApp.ThemeManager.init();
    }

    // 3. Initialize DOM event listeners
    if (WordleApp.DOMManager) {
      WordleApp.DOMManager.init();
    }

    // 4. Initialize state with master word dictionary
    const initialWords = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];
    WordleApp.State.init(initialWords);

    // 5. Initial filter run to show full candidate list
    WordleApp.Solver.refreshLiveCandidates();
  },

  /**
   * Main animation loop invoked on every frame tick by p5.js.
   */
  render() {
    WordleApp.Renderer.render();
  },

  /**
   * Handles browser viewport resize events to dynamically adjust canvas dimensions.
   */
  handleResize() {
    const canvasW = Math.min(windowWidth, 800);
    const canvasH = Math.max(320, windowHeight - this.APP_BAR_HEIGHT);
    resizeCanvas(canvasW, canvasH);
  },

  /**
   * Resets the entire solver state.
   */
  reset() {
    WordleApp.State.reset();
  },
};

/* -------------------------------------------------------------------------- */
/* Global p5.js Lifecycle Hook Bindings                                       */
/* -------------------------------------------------------------------------- */

/**
 * Global p5 setup callback.
 */
function setup() {
  WordleApp.Main.init();
}

/**
 * Global p5 draw callback.
 */
function draw() {
  WordleApp.Main.render();
}

/**
 * Global p5 resize callback.
 */
function windowResized() {
  WordleApp.Main.handleResize();
}

/**
 * Global p5 physical keyboard callback.
 */
function keyPressed() {
  return WordleApp.InputHandler.handlePhysicalKey(key, keyCode);
}

/**
 * Global p5 mouse/touch click callback.
 */
function mousePressed() {
  WordleApp.InputHandler.handleCanvasClick(mouseX, mouseY);
}
