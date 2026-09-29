/**
 * ============================================================================
 * WordleHelper - DOM Manager
 * ============================================================================
 * Manages DOM interactions outside the p5.js canvas:
 * 1. Title click to reset the entire solver state.
 * 2. Header word count badge and smooth scrolling.
 * 3. Candidate words rendering and delegated click selection.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.DOMManager = {
  candidateListElement: null,
  candidateCountElement: null,
  candidateSectionElement: null,
  candidateHeadingElement: null,
  appTitleButton: null,
  headerBadgeButton: null,
  headerWordCountElement: null,

  /**
   * Caches DOM references and binds interactive events.
   */
  init() {
    this.candidateListElement = document.getElementById("candidate-list");
    this.candidateCountElement = document.getElementById("candidate-count");
    this.candidateSectionElement = document.getElementById("candidate-section");
    this.candidateHeadingElement = document.getElementById("candidate-heading");
    this.appTitleButton = document.getElementById("app-title-btn");
    this.headerBadgeButton = document.getElementById("header-candidate-badge");
    this.headerWordCountElement = document.getElementById("header-word-count");

    // Clicking app bar title resets everything
    if (this.appTitleButton) {
      this.appTitleButton.addEventListener("click", () => {
        if (WordleApp.State) {
          WordleApp.State.reset();
        }
      });
    }

    // Clicking header candidate badge scrolls down to candidates
    if (this.headerBadgeButton) {
      this.headerBadgeButton.addEventListener("click", () => {
        this.scrollToCandidates();
      });
    }

    // Clicking candidate section heading scrolls down
    if (this.candidateHeadingElement) {
      this.candidateHeadingElement.addEventListener("click", () => {
        this.scrollToCandidates();
      });
    }

    // Delegated click handler on candidate word tiles
    if (this.candidateListElement) {
      this.candidateListElement.addEventListener("click", (event) => {
        const item = event.target.closest(".candidate-word");
        if (item && WordleApp.InputHandler) {
          WordleApp.InputHandler.selectCandidate(item.textContent.trim());
        }
      });
    }
  },

  /**
   * Smoothly scrolls the candidates section into view.
   */
  scrollToCandidates() {
    const section = this.candidateSectionElement || document.getElementById("candidate-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  },

  /**
   * Updates the candidate list grid and counter display in the DOM.
   *
   * @param {string[]} words - Array of viable candidate words.
   */
  updateCandidateList(words) {
    const count = words.length;

    if (this.candidateCountElement) {
      this.candidateCountElement.textContent = `${count} ${count === 1 ? "word" : "words"}`;
    }

    if (!this.candidateListElement) return;

    const fragment = document.createDocumentFragment();
    // Cap rendered elements if dictionary is massive for snappy DOM performance
    const renderLimit = Math.min(count, 500);

    for (let i = 0; i < renderLimit; i++) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "candidate-word";
      item.setAttribute("role", "listitem");
      item.textContent = words[i];
      fragment.appendChild(item);
    }

    if (count > renderLimit) {
      const moreNote = document.createElement("div");
      moreNote.className = "candidate-more-note";
      moreNote.textContent = `+ ${count - renderLimit} more words...`;
      fragment.appendChild(moreNote);
    }

    this.candidateListElement.replaceChildren(fragment);
  },

  /**
   * Updates the live counter on the top app bar badge.
   *
   * @param {number} count - Remaining candidate word count.
   */
  updateHeaderBadge(count) {
    if (this.headerWordCountElement) {
      this.headerWordCountElement.textContent = count;
    }
  },
};
