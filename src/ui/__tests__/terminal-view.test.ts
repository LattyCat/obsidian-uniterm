// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TerminalView } from "../terminal-view";
import { VIEW_TYPE_TERMINAL } from "../../constants";

describe("TerminalView", () => {
  let view: TerminalView;
  let mockLeaf: any;

  beforeEach(() => {
    mockLeaf = {};
    view = new TerminalView(mockLeaf as any);
  });

  describe("getViewType()", () => {
    it("returns VIEW_TYPE_TERMINAL", () => {
      expect(view.getViewType()).toBe(VIEW_TYPE_TERMINAL);
    });
  });

  describe("getDisplayText()", () => {
    it('returns "Terminal"', () => {
      expect(view.getDisplayText()).toBe("Terminal");
    });
  });

  describe("getIcon()", () => {
    it('returns "terminal"', () => {
      expect(view.getIcon()).toBe("terminal");
    });
  });

  describe("onOpen()", () => {
    it("creates container DOM element with .terminal-panel class", async () => {
      await view.onOpen();

      const container = (view as any).contentEl.querySelector(".terminal-panel");
      expect(container).not.toBeNull();
      expect(container!.tagName.toLowerCase()).toBe("div");
      expect(container!.classList.contains("terminal-panel")).toBe(true);
    });
  });

  describe("onClose()", () => {
    it("calls dispose/cleanup and removes the terminal container", async () => {
      await view.onOpen();

      // Verify container exists before close
      const containerBefore = (view as any).contentEl.querySelector(
        ".terminal-panel"
      );
      expect(containerBefore).not.toBeNull();

      await view.onClose();

      // Verify container is removed after close
      const containerAfter = (view as any).contentEl.querySelector(
        ".terminal-panel"
      );
      expect(containerAfter).toBeNull();
      expect((view as any).containerEl_terminal).toBeNull();
    });
  });
});
