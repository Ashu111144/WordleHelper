/**
 * ============================================================================
 * Wordle Solver - DOM Manager
 * ============================================================================
 * Handles HTML DOM operations outside the p5 canvas, such as rendering
 * candidate word lists, updating candidate count headers, and smooth scrolling.
 */

window.WordleApp = window.WordleApp || {};

WordleApp.DOMManager = {
  candidateListElement: null,
  candidateCountElement: null,
  candidateSectionElement: null,
  candidateHeadingElement: null,

  /**
   * Caches DOM element references and attaches DOM event listeners.
   */
  init() {
    this.candidateListElement = document.getElementById("candidate-list");
    this.candidateCountElement = document.getElementById("candidate-count");
    this.candidateSectionElement = document.getElementById("candidate-section");
    this.candidateHeadingElement = document.getElementById("candidate-heading");

    // Clicking candidate heading scrolls smoothly down to words list
    if (this.candidateHeadingElement) {
      this.candidateHeadingElement.addEventListener("click", () => {
        this.scrollToCandidates();
      });
    }

    // Delegated click handler on the candidate words container
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
   * Leverages DocumentFragment and replaceChildren for high performance.
   *
   * @param {string[]} words - Array of viable candidate words.
   */
  updateCandidateList(words) {
    if (this.candidateCountElement) {
      this.candidateCountElement.textContent = `${words.length} words`;
    }

    if (!this.candidateListElement) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < words.length; i++) {
      const item = document.createElement("div");
      item.className = "candidate-word";
      item.setAttribute("role", "listitem");
      item.textContent = words[i];
      fragment.appendChild(item);
    }

    this.candidateListElement.replaceChildren(fragment);
  },
};
