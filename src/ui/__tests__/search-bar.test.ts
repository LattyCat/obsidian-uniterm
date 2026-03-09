// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchBar } from "../search-bar";

describe("SearchBar", () => {
  let findNext: ReturnType<typeof vi.fn>;
  let findPrevious: ReturnType<typeof vi.fn>;
  let clearSearch: ReturnType<typeof vi.fn>;
  let searchBar: SearchBar;
  let parent: HTMLElement;

  beforeEach(() => {
    findNext = vi.fn();
    findPrevious = vi.fn();
    clearSearch = vi.fn();
    searchBar = new SearchBar({ findNext, findPrevious, clearSearch });
    parent = document.createElement("div");
  });

  describe("show()", () => {
    it("appends search bar element to parent", () => {
      searchBar.show(parent);

      expect(parent.querySelector(".terminal-search-bar")).not.toBeNull();
    });

    it("contains an input and navigation buttons", () => {
      searchBar.show(parent);

      expect(parent.querySelector("input")).not.toBeNull();
      expect(parent.querySelectorAll("button")).toHaveLength(3); // prev, next, close
    });

    it("focuses the input on show", () => {
      // Append parent to document so focus() works in jsdom
      document.body.appendChild(parent);
      searchBar.show(parent);

      const input = parent.querySelector("input")!;
      expect(document.activeElement).toBe(input);

      document.body.removeChild(parent);
    });

    it("does not duplicate if shown twice", () => {
      searchBar.show(parent);
      searchBar.show(parent);

      expect(
        parent.querySelectorAll(".terminal-search-bar")
      ).toHaveLength(1);
    });
  });

  describe("hide()", () => {
    it("removes the search bar from parent", () => {
      searchBar.show(parent);
      searchBar.hide();

      expect(parent.querySelector(".terminal-search-bar")).toBeNull();
    });

    it("calls clearSearch on hide", () => {
      searchBar.show(parent);
      searchBar.hide();

      expect(clearSearch).toHaveBeenCalled();
    });

    it("does nothing if not shown", () => {
      searchBar.hide(); // should not throw
    });
  });

  describe("toggle()", () => {
    it("shows when hidden", () => {
      searchBar.toggle(parent);

      expect(parent.querySelector(".terminal-search-bar")).not.toBeNull();
    });

    it("hides when shown", () => {
      searchBar.show(parent);
      searchBar.toggle(parent);

      expect(parent.querySelector(".terminal-search-bar")).toBeNull();
    });
  });

  describe("input interaction", () => {
    it("calls findNext on Enter key", () => {
      searchBar.show(parent);
      const input = parent.querySelector("input")!;
      input.value = "test";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(findNext).toHaveBeenCalledWith("test");
    });

    it("calls findPrevious on Shift+Enter key", () => {
      searchBar.show(parent);
      const input = parent.querySelector("input")!;
      input.value = "test";
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true })
      );

      expect(findPrevious).toHaveBeenCalledWith("test");
    });

    it("calls hide on Escape key", () => {
      searchBar.show(parent);
      const input = parent.querySelector("input")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(parent.querySelector(".terminal-search-bar")).toBeNull();
    });
  });

  describe("button clicks", () => {
    it("next button calls findNext", () => {
      searchBar.show(parent);
      const input = parent.querySelector("input")!;
      input.value = "query";
      const buttons = parent.querySelectorAll("button");
      // buttons: prev, next, close
      buttons[1].click();

      expect(findNext).toHaveBeenCalledWith("query");
    });

    it("prev button calls findPrevious", () => {
      searchBar.show(parent);
      const input = parent.querySelector("input")!;
      input.value = "query";
      const buttons = parent.querySelectorAll("button");
      buttons[0].click();

      expect(findPrevious).toHaveBeenCalledWith("query");
    });

    it("close button hides the bar", () => {
      searchBar.show(parent);
      const buttons = parent.querySelectorAll("button");
      buttons[2].click();

      expect(parent.querySelector(".terminal-search-bar")).toBeNull();
    });
  });

  describe("dispose()", () => {
    it("removes the element if shown", () => {
      searchBar.show(parent);
      searchBar.dispose();

      expect(parent.querySelector(".terminal-search-bar")).toBeNull();
    });

    it("does nothing if not shown", () => {
      searchBar.dispose(); // should not throw
    });
  });
});
