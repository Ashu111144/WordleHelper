/**
 * ============================================================================
 * WordleHelper - Theme Manager
 * ============================================================================
 * Manages 3-state theme cycling: System (default) -> Dark -> Light -> System.
 * Synchronizes HTML data-theme attributes, CSS custom properties, and p5 canvas
 * rendering colors. Persists user preference across page reloads via localStorage.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.ThemeManager = {
  STORAGE_KEY: "wordlehelper_theme",
  MODES: ["system", "dark", "light"],
  currentMode: "system",

  themeToggleBtn: null,
  themeIconElem: null,
  themeLabelElem: null,
  mediaQuery: null,

  /**
   * Initializes theme preferences and DOM event listeners.
   */
  init() {
    this.themeToggleBtn = document.getElementById("theme-toggle-btn");
    this.themeIconElem = document.getElementById("theme-icon");
    this.themeLabelElem = document.getElementById("theme-label");
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Retrieve saved theme preference (default to 'system')
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && this.MODES.includes(saved)) {
      this.currentMode = saved;
    } else {
      this.currentMode = "system";
    }

    // Apply active theme immediately
    this.applyTheme();

    // Attach click listener to app bar toggle button
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener("click", () => {
        this.cycleTheme();
      });
    }

    // React to operating system color scheme changes when in 'system' mode
    if (this.mediaQuery && this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener("change", () => {
        if (this.currentMode === "system") {
          this.applyTheme();
        }
      });
    }
  },

  /**
   * Resolves active effective theme ('dark' or 'light').
   * @returns {'dark'|'light'}
   */
  getEffectiveTheme() {
    if (this.currentMode === "system") {
      return this.mediaQuery && this.mediaQuery.matches ? "dark" : "light";
    }
    return this.currentMode;
  },

  /**
   * Cycles mode in the order: system -> dark -> light -> system.
   */
  cycleTheme() {
    const nextIdx = (this.MODES.indexOf(this.currentMode) + 1) % this.MODES.length;
    this.currentMode = this.MODES[nextIdx];

    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentMode);
    } catch (e) {
      // Storage might be disabled or restricted in private browsing
    }

    this.applyTheme();
  },

  /**
   * Updates DOM attributes, canvas colors, and button indicator icons.
   */
  applyTheme() {
    const effective = this.getEffectiveTheme();

    // Update document element data-theme attribute for CSS tokens
    document.documentElement.setAttribute("data-theme", effective);

    // Sync p5.js canvas colors
    const targetColors =
      effective === "light"
        ? WordleApp.Constants.LIGHT_COLORS
        : WordleApp.Constants.DARK_COLORS;

    Object.assign(WordleApp.Constants.COLORS, targetColors);

    // Update App Bar Button visual state
    if (this.themeIconElem && this.themeLabelElem) {
      if (this.currentMode === "system") {
        this.themeIconElem.textContent = "💻";
        this.themeLabelElem.textContent = "System";
      } else if (this.currentMode === "dark") {
        this.themeIconElem.textContent = "🌙";
        this.themeLabelElem.textContent = "Dark";
      } else {
        this.themeIconElem.textContent = "☀️";
        this.themeLabelElem.textContent = "Light";
      }
    }

    if (this.themeToggleBtn) {
      const readable =
        this.currentMode === "system"
          ? `System (${effective})`
          : this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
      this.themeToggleBtn.setAttribute(
        "aria-label",
        `Theme: ${readable}. Click to cycle: System, Dark, Light.`
      );
      this.themeToggleBtn.setAttribute(
        "title",
        `Theme: ${readable} (click to cycle)`
      );
    }
  },
};

// Immediate early check for theme to prevent flicker before p5 canvas setup
try {
  const savedMode = localStorage.getItem("wordlehelper_theme");
  const modeVal = savedMode && ["system", "dark", "light"].includes(savedMode) ? savedMode : "system";
  const effectiveVal = modeVal === "system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : modeVal;
  document.documentElement.setAttribute("data-theme", effectiveVal);
} catch (e) {}
