/**
 * ============================================================================
 * Wordle Solver - Application Entry Point & p5.js Lifecycle Coordinator
 * ============================================================================
 * Orchestrates the application bootstrap, canvas initialization, p5 event loops,
 * and attaches global p5 hooks.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.Main = {
  /**
   * Initializes the application systems, canvas, DOM handlers, and initial state.
   */
  init() {
    // 1. Create responsive p5 canvas and attach to DOM container #game
    createCanvas(Math.min(windowWidth, 800), windowHeight).parent("game");
    rectMode(CORNER);
    textAlign(CENTER, CENTER);

    // 2. Initialize DOM event listeners
    WordleApp.DOMManager.init();

    // 3. Initialize state with master word dictionary
    const initialWords = typeof WORD_LIST !== "undefined" ? WORD_LIST : [];
    WordleApp.State.init(initialWords);

    // 4. Initial filter run to show full candidate list
    WordleApp.Solver.refreshLiveCandidates();
  },

  /**
   * Main animation loop invoked on every frame tick by p5.js.
   */
  render() {
    WordleApp.Renderer.render();
  },

  /**
   * Handles browser viewport resize events to adjust canvas width and height dynamically.
   */
  handleResize() {
    resizeCanvas(Math.min(windowWidth, 800), windowHeight);
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
