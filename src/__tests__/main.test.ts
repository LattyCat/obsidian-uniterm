import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock terminal-view
vi.mock("../ui/terminal-view", () => ({
  TerminalView: vi.fn(),
}));

// Mock session-manager
vi.mock("../core/session-manager", () => ({
  SessionManager: vi.fn(() => ({
    destroyAll: vi.fn(() => Promise.resolve()),
  })),
}));

import TerminalPlugin from "../main";
import { VIEW_TYPE_TERMINAL } from "../constants";

describe("TerminalPlugin", () => {
  let plugin: TerminalPlugin;
  let mockRevealLeaf: ReturnType<typeof vi.fn>;
  let mockGetLeavesOfType: ReturnType<typeof vi.fn>;
  let mockGetRightLeaf: ReturnType<typeof vi.fn>;
  let mockSetViewState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRevealLeaf = vi.fn();
    mockGetLeavesOfType = vi.fn(() => []);
    mockSetViewState = vi.fn(() => Promise.resolve());
    mockGetRightLeaf = vi.fn(() => ({
      setViewState: mockSetViewState,
    }));

    const mockApp = {
      workspace: {
        getLeavesOfType: mockGetLeavesOfType,
        getRightLeaf: mockGetRightLeaf,
        revealLeaf: mockRevealLeaf,
      },
    };

    plugin = new TerminalPlugin(mockApp as any, {} as any);
  });

  describe("onload()", () => {
    it("registers the terminal view type", async () => {
      const registerViewSpy = vi.spyOn(plugin, "registerView" as any);

      await plugin.onload();

      expect(registerViewSpy).toHaveBeenCalledWith(
        VIEW_TYPE_TERMINAL,
        expect.any(Function)
      );
    });

    it("adds a ribbon icon", async () => {
      const addRibbonIconSpy = vi.spyOn(plugin, "addRibbonIcon" as any);

      await plugin.onload();

      expect(addRibbonIconSpy).toHaveBeenCalledWith(
        "terminal",
        "Open Terminal",
        expect.any(Function)
      );
    });

    it("registers the toggle command", async () => {
      const addCommandSpy = vi.spyOn(plugin, "addCommand" as any);

      await plugin.onload();

      expect(addCommandSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "toggle-terminal",
          name: "Toggle Terminal Panel",
          callback: expect.any(Function),
        })
      );
    });
  });

  describe("onunload()", () => {
    it("calls sessionManager.destroyAll()", async () => {
      await plugin.onunload();

      expect(plugin.sessionManager.destroyAll).toHaveBeenCalled();
    });
  });

  describe("toggleTerminalPanel()", () => {
    it("activates existing leaf if one exists", async () => {
      const existingLeaf = { id: "existing-leaf" };
      mockGetLeavesOfType.mockReturnValue([existingLeaf]);

      await plugin.toggleTerminalPanel();

      expect(mockGetLeavesOfType).toHaveBeenCalledWith(VIEW_TYPE_TERMINAL);
      expect(mockRevealLeaf).toHaveBeenCalledWith(existingLeaf);
      expect(mockGetRightLeaf).not.toHaveBeenCalled();
    });

    it("creates a new leaf if none exists", async () => {
      mockGetLeavesOfType.mockReturnValue([]);

      await plugin.toggleTerminalPanel();

      expect(mockGetRightLeaf).toHaveBeenCalledWith(false);
      expect(mockSetViewState).toHaveBeenCalledWith({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
      expect(mockRevealLeaf).toHaveBeenCalled();
    });
  });
});
