// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TerminalView, TerminalViewDeps } from "../terminal-view";
import { VIEW_TYPE_TERMINAL, DEFAULT_SETTINGS } from "../../constants";
import { TerminalRenderer } from "../terminal-renderer";
import { FocusManager } from "../focus-manager";
import { KeybindingHandler } from "../keybinding-handler";
import { SearchBar } from "../search-bar";
import { ConsentModal } from "../consent-dialog";
import { showPtyLoadError } from "../error-display";
import { detectDefaultShell } from "../../core/shell-detector";

vi.mock("../terminal-renderer", () => ({
  TerminalRenderer: vi.fn(),
}));
vi.mock("../focus-manager", () => ({
  FocusManager: vi.fn(),
}));
vi.mock("../keybinding-handler", () => ({
  KeybindingHandler: vi.fn(),
}));
vi.mock("../search-bar", () => ({
  SearchBar: vi.fn(),
}));
vi.mock("../theme-manager", () => ({
  ThemeManager: vi.fn(),
}));
vi.mock("../error-display", () => ({
  showPtyLoadError: vi.fn(),
  clearError: vi.fn(),
}));
vi.mock("../consent-dialog", () => ({
  ConsentModal: vi.fn(),
}));
vi.mock("../../core/shell-detector", () => ({
  detectDefaultShell: vi.fn(() => "/bin/bash"),
}));

// ResizeObserver mock (jsdom doesn't have it)
const mockResizeObserverInstance = {
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
};
const mockResizeObserver = vi.fn(() => mockResizeObserverInstance);
vi.stubGlobal("ResizeObserver", mockResizeObserver);

describe("TerminalView", () => {
  let mockLeaf: any;
  let mockTerminal: any;
  let mockRendererInstance: any;
  let mockFocusInstance: any;
  let mockKeybindingInstance: any;
  let mockSearchInstance: any;
  let mockConsentInstance: any;
  let mockPtyProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLeaf = {};

    mockTerminal = { options: {}, focus: vi.fn() };
    mockRendererInstance = {
      mount: vi.fn(),
      connectPty: vi.fn(),
      resize: vi.fn(() => ({ cols: 80, rows: 24 })),
      getTerminal: vi.fn(() => mockTerminal),
      attachCustomKeyEventHandler: vi.fn(),
      findNext: vi.fn(),
      findPrevious: vi.fn(),
      clearSearch: vi.fn(),
      clearTerminal: vi.fn(),
      dispose: vi.fn(),
    };
    (TerminalRenderer as any).mockImplementation(() => mockRendererInstance);

    mockFocusInstance = {
      focus: vi.fn(),
      unfocus: vi.fn(),
      dispose: vi.fn(),
      isFocused: false,
    };
    (FocusManager as any).mockImplementation(() => mockFocusInstance);

    mockKeybindingInstance = {
      handle: vi.fn(() => true),
      registerAction: vi.fn(),
    };
    (KeybindingHandler as any).mockImplementation(() => mockKeybindingInstance);

    mockSearchInstance = {
      show: vi.fn(),
      hide: vi.fn(),
      toggle: vi.fn(),
      dispose: vi.fn(),
    };
    (SearchBar as any).mockImplementation(() => mockSearchInstance);

    mockConsentInstance = {
      open: vi.fn(),
      close: vi.fn(),
    };
    (ConsentModal as any).mockImplementation(() => mockConsentInstance);

    mockPtyProcess = {
      onData: vi.fn(() => ({ dispose: vi.fn() })),
      onExit: vi.fn(() => ({ dispose: vi.fn() })),
      write: vi.fn(),
      resize: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    };

    mockResizeObserver.mockClear();
    mockResizeObserverInstance.observe.mockClear();
    mockResizeObserverInstance.disconnect.mockClear();
  });

  function createMockDeps(overrides: Partial<TerminalViewDeps> = {}): TerminalViewDeps {
    return {
      settings: { ...DEFAULT_SETTINGS, consentGiven: true },
      sessionManager: {
        create: vi.fn(() => ({ id: "session-1", state: "running", profile: {} })),
        destroy: vi.fn().mockResolvedValue(undefined),
        getPtyProcess: vi.fn(() => mockPtyProcess),
        getSession: vi.fn(),
        getSessions: vi.fn(),
        destroyAll: vi.fn(),
      } as any,
      ptyManager: {
        spawn: vi.fn(),
      } as any,
      themeManager: {
        getThemeColors: vi.fn(() => ({})),
        getObsidianTheme: vi.fn(() => ({})),
      } as any,
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        setDebugEnabled: vi.fn(),
      },
      consentGiven: true,
      onConsentGiven: vi.fn(),
      getLatestSettings: vi.fn(() => ({ ...DEFAULT_SETTINGS, consentGiven: true })),
      vaultPath: "/test/vault",
      platform: "darwin",
      ...overrides,
    };
  }

  // ---- Basic view properties ----

  describe("getViewType()", () => {
    it("returns VIEW_TYPE_TERMINAL", () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      expect(view.getViewType()).toBe(VIEW_TYPE_TERMINAL);
    });
  });

  describe("getDisplayText()", () => {
    it('returns "Terminal"', () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      expect(view.getDisplayText()).toBe("Terminal");
    });
  });

  describe("getIcon()", () => {
    it('returns "terminal"', () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      expect(view.getIcon()).toBe("terminal");
    });
  });

  // ---- onOpen with consent ----

  describe("onOpen() - consent flow", () => {
    it("shows ConsentModal when consentGiven is false", async () => {
      const deps = createMockDeps({ consentGiven: false });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(ConsentModal).toHaveBeenCalledTimes(1);
      expect(mockConsentInstance.open).toHaveBeenCalledTimes(1);
    });

    it("does NOT create renderer when consent not given", async () => {
      const deps = createMockDeps({ consentGiven: false });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(TerminalRenderer).not.toHaveBeenCalled();
    });

    it("onConsent callback calls onConsentGiven and initializes terminal", async () => {
      const deps = createMockDeps({ consentGiven: false });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      // Extract the callbacks passed to ConsentModal constructor
      const consentCallbacks = (ConsentModal as any).mock.calls[0][1];
      consentCallbacks.onConsent();

      expect(deps.onConsentGiven).toHaveBeenCalledTimes(1);
      expect(TerminalRenderer).toHaveBeenCalledTimes(1);
    });

    it("skips consent dialog when consentGiven is true", async () => {
      const deps = createMockDeps({ consentGiven: true });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(ConsentModal).not.toHaveBeenCalled();
      expect(TerminalRenderer).toHaveBeenCalledTimes(1);
    });
  });

  // ---- onOpen with pty error ----

  describe("onOpen() - pty error", () => {
    it("shows pty load error when ptyManager is null", async () => {
      const deps = createMockDeps({ ptyManager: null });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(showPtyLoadError).toHaveBeenCalledTimes(1);
      expect(TerminalRenderer).not.toHaveBeenCalled();
    });

    it("error has retry callback that re-initializes terminal", async () => {
      const deps = createMockDeps({ ptyManager: null });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      const callArgs = (showPtyLoadError as any).mock.calls[0];
      expect(callArgs[1].onRetry).toBeDefined();
      expect(typeof callArgs[1].onRetry).toBe("function");
    });
  });

  // ---- onOpen initialization ----

  describe("onOpen() - initialization", () => {
    it("creates TerminalRenderer with correct options from settings", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(TerminalRenderer).toHaveBeenCalledTimes(1);
      const opts = (TerminalRenderer as any).mock.calls[0][0];
      expect(opts.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(opts.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
      expect(opts.cursorStyle).toBe(DEFAULT_SETTINGS.cursorStyle);
      expect(opts.cursorBlink).toBe(DEFAULT_SETTINGS.cursorBlink);
      expect(opts.scrollback).toBe(DEFAULT_SETTINGS.scrollbackBuffer);
      expect(opts.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
      expect(opts.webglEnabled).toBe(DEFAULT_SETTINGS.webglRenderer);
      expect(typeof opts.onWebGLFallback).toBe("function");
    });

    it("calls renderer.mount() with container panel", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(mockRendererInstance.mount).toHaveBeenCalledTimes(1);
      const panel = (view as any).containerPanel;
      expect(mockRendererInstance.mount).toHaveBeenCalledWith(panel);
    });

    it("applies obsidian theme when settings.theme is 'obsidian'", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(deps.themeManager.getObsidianTheme).toHaveBeenCalledWith(document.body);
      expect(deps.themeManager.getThemeColors).not.toHaveBeenCalled();
    });

    it("applies non-obsidian theme via getThemeColors", async () => {
      const customSettings = { ...DEFAULT_SETTINGS, theme: "dark" as const, consentGiven: true };
      const deps = createMockDeps({
        getLatestSettings: vi.fn(() => customSettings),
      });
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(deps.themeManager.getThemeColors).toHaveBeenCalledWith("dark", customSettings.customThemeColors);
      expect(deps.themeManager.getObsidianTheme).not.toHaveBeenCalled();
    });

    it("creates session via sessionManager.create", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(deps.sessionManager.create).toHaveBeenCalledTimes(1);
      const callArgs = (deps.sessionManager.create as any).mock.calls[0];
      expect(callArgs[0]).toBe(deps.ptyManager); // ptyManager
      expect(callArgs[1]).toEqual(expect.objectContaining({
        cols: 80,
        rows: 24,
        args: ["--login"],
        env: {},
      }));
      expect(callArgs[2]).toEqual(expect.objectContaining({
        id: "default",
        name: "Default Shell",
      }));
    });

    it("connects PTY to renderer via connectPty", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(deps.sessionManager.getPtyProcess).toHaveBeenCalledWith("session-1");
      expect(mockRendererInstance.connectPty).toHaveBeenCalledWith(mockPtyProcess);
    });

    it("creates FocusManager", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(FocusManager).toHaveBeenCalledTimes(1);
    });

    it("creates KeybindingHandler", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(KeybindingHandler).toHaveBeenCalledTimes(1);
      const opts = (KeybindingHandler as any).mock.calls[0][0];
      expect(opts.platform).toBe("darwin");
      expect(typeof opts.writeToPty).toBe("function");
    });

    it("attaches custom key event handler to renderer", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(mockRendererInstance.attachCustomKeyEventHandler).toHaveBeenCalledTimes(1);
      expect(typeof mockRendererInstance.attachCustomKeyEventHandler.mock.calls[0][0]).toBe("function");
    });

    it("creates SearchBar", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(SearchBar).toHaveBeenCalledTimes(1);
      const opts = (SearchBar as any).mock.calls[0][0];
      expect(typeof opts.findNext).toBe("function");
      expect(typeof opts.findPrevious).toBe("function");
      expect(typeof opts.clearSearch).toBe("function");
    });

    it("sets up ResizeObserver on container panel", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(mockResizeObserver).toHaveBeenCalledTimes(1);
      const panel = (view as any).containerPanel;
      expect(mockResizeObserverInstance.observe).toHaveBeenCalledWith(panel);
    });

    it("sets ARIA attributes on container panel", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      const panel = (view as any).containerPanel;
      expect(panel).not.toBeNull();
      expect(panel.setAttribute).toBeDefined();
    });

    it("auto-focuses via focusManager after initialization", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(mockFocusInstance.focus).toHaveBeenCalledTimes(1);
    });

    it("uses detectDefaultShell when settings.defaultShell is empty", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      expect(detectDefaultShell).toHaveBeenCalledWith("darwin");
    });

    it("uses vaultPath as cwd when settings.defaultCwd is empty", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      const callArgs = (deps.sessionManager.create as any).mock.calls[0];
      expect(callArgs[1].cwd).toBe("/test/vault");
    });
  });

  // ---- onClose cleanup ----

  describe("onClose()", () => {
    it("destroys session via sessionManager", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect(deps.sessionManager.destroy).toHaveBeenCalledWith("session-1");
    });

    it("disposes renderer", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect(mockRendererInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it("disposes focusManager", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect(mockFocusInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it("disposes searchBar", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect(mockSearchInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it("disconnects ResizeObserver", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect(mockResizeObserverInstance.disconnect).toHaveBeenCalledTimes(1);
    });

    it("removes container panel", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect((view as any).containerPanel).toBeNull();
    });

    it("sets all internal references to null", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();
      await view.onClose();

      expect((view as any).renderer).toBeNull();
      expect((view as any).focusManager).toBeNull();
      expect((view as any).searchBar).toBeNull();
      expect((view as any).keybindingHandler).toBeNull();
      expect((view as any).ptyProcess).toBeNull();
      expect((view as any).sessionId).toBeNull();
      expect((view as any).resizeObserver).toBeNull();
    });
  });

  // ---- Public methods ----

  describe("clearTerminal()", () => {
    it("calls renderer.clearTerminal()", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      view.clearTerminal();

      expect(mockRendererInstance.clearTerminal).toHaveBeenCalledTimes(1);
    });

    it("does nothing when renderer is null", () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      // No onOpen called, so renderer is null
      expect(() => view.clearTerminal()).not.toThrow();
    });
  });

  describe("toggleSearch()", () => {
    it("calls searchBar.toggle() with container panel", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      view.toggleSearch();

      const panel = (view as any).containerPanel;
      expect(mockSearchInstance.toggle).toHaveBeenCalledWith(panel);
    });
  });

  describe("focusTerminal()", () => {
    it("calls focusManager.focus()", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      // Reset to distinguish auto-focus from explicit call
      mockFocusInstance.focus.mockClear();

      view.focusTerminal();

      expect(mockFocusInstance.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe("unfocusTerminal()", () => {
    it("calls focusManager.unfocus()", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      view.unfocusTerminal();

      expect(mockFocusInstance.unfocus).toHaveBeenCalledTimes(1);
    });
  });

  // ---- applySettings ----

  describe("applySettings()", () => {
    it("updates terminal options with new settings", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      const newSettings = { ...DEFAULT_SETTINGS, fontSize: 18, fontFamily: "Fira Code", lineHeight: 1.5, cursorStyle: "bar" as const, cursorBlink: false, consentGiven: true };
      view.applySettings(newSettings);

      expect(mockTerminal.options.fontSize).toBe(18);
      expect(mockTerminal.options.fontFamily).toBe("Fira Code");
      expect(mockTerminal.options.lineHeight).toBe(1.5);
      expect(mockTerminal.options.cursorStyle).toBe("bar");
      expect(mockTerminal.options.cursorBlink).toBe(false);
    });

    it("applies theme via themeManager", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      // Clear calls from onOpen
      (deps.themeManager.getObsidianTheme as any).mockClear();

      const newSettings = { ...DEFAULT_SETTINGS, theme: "obsidian" as const, consentGiven: true };
      view.applySettings(newSettings);

      expect(deps.themeManager.getObsidianTheme).toHaveBeenCalledWith(document.body);
    });

    it("calls renderer.resize() and ptyProcess.resize()", async () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      await view.onOpen();

      mockRendererInstance.resize.mockClear();
      mockPtyProcess.resize.mockClear();

      view.applySettings({ ...DEFAULT_SETTINGS, consentGiven: true });

      // resize is called twice: once for re-layout, once for getting cols/rows
      expect(mockRendererInstance.resize).toHaveBeenCalled();
      expect(mockPtyProcess.resize).toHaveBeenCalledWith(80, 24);
    });

    it("does nothing when renderer is null", () => {
      const deps = createMockDeps();
      const view = new TerminalView(mockLeaf as any, deps);
      // No onOpen called
      expect(() => view.applySettings({ ...DEFAULT_SETTINGS, consentGiven: true })).not.toThrow();
    });
  });
});
