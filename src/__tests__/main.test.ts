import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("../ui/terminal-view", () => ({
  TerminalView: vi.fn(),
}));

vi.mock("../core/session-manager", () => ({
  SessionManager: vi.fn(() => ({
    destroyAll: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("../core/pty-manager", () => ({
  PtyManager: vi.fn(),
}));

vi.mock("../core/electron-bridge", () => ({
  loadNodePty: vi.fn(() => ({ pty: {}, error: null })),
}));

vi.mock("../ui/theme-manager", () => ({
  ThemeManager: vi.fn(() => ({
    getThemeColors: vi.fn(),
    getObsidianTheme: vi.fn(),
  })),
}));

vi.mock("../core/logger", () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    setDebugEnabled: vi.fn(),
  })),
}));

vi.mock("../settings/settings-data", () => ({
  loadSettings: vi.fn(() => Promise.resolve({
    defaultShell: "",
    defaultCwd: "",
    autoShow: false,
    scrollbackBuffer: 10000,
    fontFamily: "Menlo",
    fontSize: 14,
    lineHeight: 1.2,
    cursorStyle: "block",
    cursorBlink: true,
    theme: "obsidian",
    webglRenderer: true,
    shiftEnterSequence: "\x1b\r",
    passthroughKeybindings: [],
    debugLog: false,
    consentGiven: false,
    customThemeColors: {},
    screenReaderMode: false,
    panelHeight: 300,
  })),
  saveSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock("../integration/obsidian-commands", () => ({
  registerCommands: vi.fn(),
}));

vi.mock("../settings/settings-tab", () => ({
  TerminalSettingTab: vi.fn(),
}));

import TerminalPlugin from "../main";
import { VIEW_TYPE_TERMINAL } from "../constants";
import { loadNodePty } from "../core/electron-bridge";
import { loadSettings } from "../settings/settings-data";
import { registerCommands } from "../integration/obsidian-commands";
import { createLogger } from "../core/logger";
import { ThemeManager } from "../ui/theme-manager";
import { TerminalSettingTab } from "../settings/settings-tab";

describe("TerminalPlugin", () => {
  let plugin: TerminalPlugin;
  let mockRevealLeaf: ReturnType<typeof vi.fn>;
  let mockGetLeavesOfType: ReturnType<typeof vi.fn>;
  let mockGetLeaf: ReturnType<typeof vi.fn>;
  let mockSetViewState: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRevealLeaf = vi.fn();
    mockGetLeavesOfType = vi.fn(() => []);
    mockSetViewState = vi.fn(() => Promise.resolve());
    mockGetLeaf = vi.fn(() => ({
      setViewState: mockSetViewState,
    }));
    mockOn = vi.fn(() => ({}));

    const mockApp = {
      workspace: {
        getLeavesOfType: mockGetLeavesOfType,
        getLeaf: mockGetLeaf,
        revealLeaf: mockRevealLeaf,
        on: mockOn,
        getActiveViewOfType: vi.fn(() => null),
      },
      vault: {
        adapter: { basePath: "/test/vault" },
      },
    };

    // Mock window.getComputedStyle
    vi.stubGlobal("window", {
      getComputedStyle: vi.fn(() => ({})),
    });

    plugin = new TerminalPlugin(mockApp as any, {} as any);
  });

  describe("onload()", () => {
    it("loads settings", async () => {
      await plugin.onload();
      expect(loadSettings).toHaveBeenCalledWith(plugin);
    });

    it("creates logger with debug setting", async () => {
      await plugin.onload();
      expect(createLogger).toHaveBeenCalledWith(false);
    });

    it("loads node-pty", async () => {
      await plugin.onload();
      expect(loadNodePty).toHaveBeenCalled();
    });

    it("logs error when node-pty fails to load", async () => {
      (loadNodePty as any).mockReturnValue({ pty: null, error: "Load failed" });
      await plugin.onload();
      const logger = (createLogger as any).mock.results[0].value;
      expect(logger.error).toHaveBeenCalledWith("Load failed");
    });

    it("creates ThemeManager", async () => {
      await plugin.onload();
      expect(ThemeManager).toHaveBeenCalled();
    });

    it("registers the terminal view type", async () => {
      const registerViewSpy = vi.spyOn(plugin, "registerView" as any);
      await plugin.onload();
      expect(registerViewSpy).toHaveBeenCalledWith(
        VIEW_TYPE_TERMINAL,
        expect.any(Function)
      );
    });

    it("registers commands via registerCommands", async () => {
      await plugin.onload();
      expect(registerCommands).toHaveBeenCalledWith(
        plugin,
        expect.objectContaining({
          toggleTerminal: expect.any(Function),
          focusTerminal: expect.any(Function),
          unfocusTerminal: expect.any(Function),
          clearTerminal: expect.any(Function),
          findInTerminal: expect.any(Function),
          newTab: expect.any(Function),
          closeTab: expect.any(Function),
          getActiveTerminalView: expect.any(Function),
        })
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

    it("registers css-change event", async () => {
      await plugin.onload();
      expect(mockOn).toHaveBeenCalledWith("css-change", expect.any(Function));
    });

    it("registers TerminalSettingTab", async () => {
      const addSettingTabSpy = vi.spyOn(plugin, "addSettingTab" as any);
      await plugin.onload();
      expect(addSettingTabSpy).toHaveBeenCalledTimes(1);
      expect(TerminalSettingTab).toHaveBeenCalledWith(plugin.app, plugin);
    });
  });

  describe("onunload()", () => {
    it("calls sessionManager.destroyAll()", async () => {
      await plugin.onload();
      await plugin.onunload();
      expect(plugin.sessionManager.destroyAll).toHaveBeenCalled();
    });
  });

  describe("toggleTerminalPanel()", () => {
    it("activates existing leaf if one exists", async () => {
      const existingLeaf = { id: "existing-leaf" };
      mockGetLeavesOfType.mockReturnValue([existingLeaf]);
      await plugin.toggleTerminalPanel();
      expect(mockRevealLeaf).toHaveBeenCalledWith(existingLeaf);
      expect(mockGetLeaf).not.toHaveBeenCalled();
    });

    it("creates a new leaf if none exists", async () => {
      mockGetLeavesOfType.mockReturnValue([]);
      await plugin.toggleTerminalPanel();
      expect(mockGetLeaf).toHaveBeenCalledWith("split", "horizontal");
      expect(mockSetViewState).toHaveBeenCalledWith({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
      expect(mockRevealLeaf).toHaveBeenCalled();
    });
  });

  describe("onThemeChange()", () => {
    it("calls applyTheme() on all terminal views when css-change fires", async () => {
      const mockApplyTheme = vi.fn();
      const mockView = { applyTheme: mockApplyTheme };
      const mockLeaves = [{ view: mockView }, { view: { applyTheme: mockApplyTheme } }];
      mockGetLeavesOfType.mockReturnValue(mockLeaves);

      await plugin.onload();

      // Extract the css-change callback
      const cssChangeCall = mockOn.mock.calls.find(
        (call: any[]) => call[0] === "css-change"
      );
      expect(cssChangeCall).toBeDefined();
      const cssChangeCallback = cssChangeCall![1];

      // Fire the callback
      cssChangeCallback();

      expect(mockGetLeavesOfType).toHaveBeenCalledWith(VIEW_TYPE_TERMINAL);
      expect(mockApplyTheme).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleActiveLeafChange()", () => {
    it("converts empty leaf to terminal when same tab group has a terminal", async () => {
      const sharedParent = { id: "tab-group-1" };
      const mockTerminalLeaf = { parent: sharedParent };
      const mockEmptyLeaf = {
        parent: sharedParent,
        getViewState: () => ({ type: "empty" }),
        setViewState: vi.fn(() => Promise.resolve()),
      };

      mockGetLeavesOfType.mockReturnValue([mockTerminalLeaf]);

      await plugin.onload();

      // Extract the active-leaf-change callback
      const leafChangeCall = mockOn.mock.calls.find(
        (call: any[]) => call[0] === "active-leaf-change"
      );
      expect(leafChangeCall).toBeDefined();
      const leafChangeCallback = leafChangeCall![1];

      leafChangeCallback(mockEmptyLeaf);

      expect(mockEmptyLeaf.setViewState).toHaveBeenCalledWith({
        type: VIEW_TYPE_TERMINAL,
        active: true,
      });
    });

    it("does not convert empty leaf when no terminal in same tab group", async () => {
      const mockEmptyLeaf = {
        parent: { id: "tab-group-1" },
        getViewState: () => ({ type: "empty" }),
        setViewState: vi.fn(),
      };
      const mockTerminalLeaf = {
        parent: { id: "tab-group-2" }, // different parent
      };

      mockGetLeavesOfType.mockReturnValue([mockTerminalLeaf]);

      await plugin.onload();

      const leafChangeCall = mockOn.mock.calls.find(
        (call: any[]) => call[0] === "active-leaf-change"
      );
      leafChangeCall![1](mockEmptyLeaf);

      expect(mockEmptyLeaf.setViewState).not.toHaveBeenCalled();
    });

    it("does not convert non-empty leaf", async () => {
      const sharedParent = { id: "tab-group-1" };
      const mockTerminalLeaf = { parent: sharedParent };
      const mockNonEmptyLeaf = {
        parent: sharedParent,
        getViewState: () => ({ type: "markdown" }),
        setViewState: vi.fn(),
      };

      mockGetLeavesOfType.mockReturnValue([mockTerminalLeaf]);

      await plugin.onload();

      const leafChangeCall = mockOn.mock.calls.find(
        (call: any[]) => call[0] === "active-leaf-change"
      );
      leafChangeCall![1](mockNonEmptyLeaf);

      expect(mockNonEmptyLeaf.setViewState).not.toHaveBeenCalled();
    });

    it("handles null leaf without error", async () => {
      await plugin.onload();

      const leafChangeCall = mockOn.mock.calls.find(
        (call: any[]) => call[0] === "active-leaf-change"
      );

      expect(() => leafChangeCall![1](null)).not.toThrow();
    });
  });

  describe("updateSettings()", () => {
    it("updates settings and saves", async () => {
      const { saveSettings } = await import("../settings/settings-data");
      await plugin.onload();
      await plugin.updateSettings({ fontSize: 16 });
      expect(plugin.settings.fontSize).toBe(16);
      expect(saveSettings).toHaveBeenCalled();
    });

    it("notifies active terminal views with applySettings", async () => {
      const mockApplySettings = vi.fn();
      const mockView = { applySettings: mockApplySettings };
      const mockLeaf = { view: mockView };
      mockGetLeavesOfType.mockReturnValue([mockLeaf]);

      await plugin.onload();
      await plugin.updateSettings({ fontSize: 18 });

      expect(mockApplySettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 18 })
      );
    });

    it("skips views without applySettings method", async () => {
      const mockView = {}; // no applySettings
      const mockLeaf = { view: mockView };
      mockGetLeavesOfType.mockReturnValue([mockLeaf]);

      await plugin.onload();
      // Should not throw
      await expect(plugin.updateSettings({ fontSize: 18 })).resolves.not.toThrow();
    });
  });
});
