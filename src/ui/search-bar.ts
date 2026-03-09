export interface SearchBarOptions {
  findNext: (term: string) => void;
  findPrevious: (term: string) => void;
  clearSearch: () => void;
}

export class SearchBar {
  private element: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private findNext: (term: string) => void;
  private findPrevious: (term: string) => void;
  private clearSearch: () => void;
  private visible = false;

  constructor(options: SearchBarOptions) {
    this.findNext = options.findNext;
    this.findPrevious = options.findPrevious;
    this.clearSearch = options.clearSearch;
  }

  show(parent: HTMLElement): void {
    if (this.visible) return;
    this.visible = true;

    this.element = document.createElement("div");
    this.element.className = "terminal-search-bar";

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Search...";
    this.input.className = "terminal-search-input";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "▲";
    prevBtn.className = "terminal-search-btn";
    prevBtn.addEventListener("click", () => {
      if (this.input) this.findPrevious(this.input.value);
    });

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "▼";
    nextBtn.className = "terminal-search-btn";
    nextBtn.addEventListener("click", () => {
      if (this.input) this.findNext(this.input.value);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.className = "terminal-search-btn terminal-search-close";
    closeBtn.addEventListener("click", () => {
      this.hide();
    });

    this.input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          this.findPrevious(this.input!.value);
        } else {
          this.findNext(this.input!.value);
        }
      } else if (e.key === "Escape") {
        this.hide();
      }
    });

    this.element.appendChild(this.input);
    this.element.appendChild(prevBtn);
    this.element.appendChild(nextBtn);
    this.element.appendChild(closeBtn);
    parent.appendChild(this.element);

    this.input.focus();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.clearSearch();
    this.element?.remove();
    this.element = null;
    this.input = null;
  }

  toggle(parent: HTMLElement): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show(parent);
    }
  }

  dispose(): void {
    if (this.visible) {
      this.hide();
    }
  }
}
