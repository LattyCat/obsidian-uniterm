// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock xterm and addons before importing
const mockTerminalInstance = {
  loadAddon: vi.fn(),
  open: vi.fn(),
  write: vi.fn(),
  onData: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
  select: vi.fn(),
  getSelection: vi.fn(() => ""),
  hasSelection: vi.fn(() => false),
  clear: vi.fn(),
  attachCustomKeyEventHandler: vi.fn(),
  cols: 80,
  rows: 24,
};

const mockFitAddonInstance = {
  fit: vi.fn(),
  dispose: vi.fn(),
};

const mockWebLinksAddonInstance = {
  dispose: vi.fn(),
};

const mockUnicode11AddonInstance = {
  dispose: vi.fn(),
};

const mockWebglAddonInstance = {
  dispose: vi.fn(),
  onContextLoss: vi.fn(() => ({ dispose: vi.fn() })),
};

const mockSearchAddonInstance = {
  findNext: vi.fn(() => false),
  findPrevious: vi.fn(() => false),
  clearDecorations: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn(() => mockTerminalInstance),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn(() => mockFitAddonInstance),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn(() => mockWebLinksAddonInstance),
}));

vi.mock("@xterm/addon-unicode11", () => ({
  Unicode11Addon: vi.fn(() => mockUnicode11AddonInstance),
}));

vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: vi.fn(() => mockWebglAddonInstance),
}));

vi.mock("@xterm/addon-search", () => ({
  SearchAddon: vi.fn(() => mockSearchAddonInstance),
}));

import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { TerminalRenderer } from "../terminal-renderer";

describe("TerminalRenderer", () => {
  const defaultOptions = {
    fontSize: 14,
    fontFamily: "Menlo, Monaco, monospace",
    cursorStyle: "block" as const,
    cursorBlink: true,
    scrollback: 10000,
    lineHeight: 1.2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock behaviors after clearAllMocks
    (WebglAddon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockWebglAddonInstance);
    mockWebglAddonInstance.onContextLoss.mockReturnValue({ dispose: vi.fn() });
    mockTerminalInstance.getSelection.mockReturnValue("");
    mockTerminalInstance.hasSelection.mockReturnValue(false);
    mockTerminalInstance.onData.mockReturnValue({ dispose: vi.fn() });
    mockSearchAddonInstance.findNext.mockReturnValue(false);
    mockSearchAddonInstance.findPrevious.mockReturnValue(false);
  });

  describe("constructor", () => {
    it("creates xterm Terminal with correct options", () => {
      new TerminalRenderer(defaultOptions);

      expect(Terminal).toHaveBeenCalledWith({
        fontSize: 14,
        fontFamily: "Menlo, Monaco, monospace",
        cursorStyle: "block",
        cursorBlink: true,
        scrollback: 10000,
        lineHeight: 1.2,
      });
    });
  });

  describe("loadAddons()", () => {
    it("loads fit, web-links, unicode11, and search addons", () => {
      new TerminalRenderer(defaultOptions);

      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(4);
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockFitAddonInstance
      );
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockWebLinksAddonInstance
      );
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockUnicode11AddonInstance
      );
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockSearchAddonInstance
      );
    });
  });

  describe("mount()", () => {
    it("calls terminal.open(container) and fitAddon.fit()", () => {
      const renderer = new TerminalRenderer(defaultOptions);
      const container = document.createElement("div");

      renderer.mount(container);

      expect(mockTerminalInstance.open).toHaveBeenCalledWith(container);
      expect(mockFitAddonInstance.fit).toHaveBeenCalled();
    });

    it("does not load WebGL when webglEnabled is false", () => {
      const renderer = new TerminalRenderer({
        ...defaultOptions,
        webglEnabled: false,
      });
      const container = document.createElement("div");
      const initialLoadCount = mockTerminalInstance.loadAddon.mock.calls.length;

      renderer.mount(container);

      // No additional loadAddon calls for WebGL
      const postMountLoadCount =
        mockTerminalInstance.loadAddon.mock.calls.length;
      expect(postMountLoadCount).toBe(initialLoadCount);
    });

    it("attempts to load WebGL when webglEnabled is true (default)", () => {
      const renderer = new TerminalRenderer({
        ...defaultOptions,
        webglEnabled: true,
      });
      const container = document.createElement("div");

      renderer.mount(container);

      // WebGL addon should be loaded
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockWebglAddonInstance
      );
    });

    it("calls onWebGLFallback when WebGL loading fails", () => {
      // Use mockImplementationOnce so it doesn't persist to other tests
      // First 4 calls are from loadAddons() in constructor, 5th is WebGL in mount
      mockTerminalInstance.loadAddon
        .mockImplementation((addon: unknown) => {
          if (addon === mockWebglAddonInstance) {
            throw new Error("WebGL not supported");
          }
        });

      const onWebGLFallback = vi.fn();
      const renderer = new TerminalRenderer({
        ...defaultOptions,
        webglEnabled: true,
        onWebGLFallback,
      });
      const container = document.createElement("div");

      renderer.mount(container);

      expect(onWebGLFallback).toHaveBeenCalled();

      // Restore the mock so it doesn't affect subsequent tests
      mockTerminalInstance.loadAddon.mockReset();
    });

    it("handles WebGL context loss", () => {
      let contextLossCallback: (() => void) | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockWebglAddonInstance.onContextLoss as any).mockImplementation(
        (cb: () => void) => {
          contextLossCallback = cb;
          return { dispose: vi.fn() };
        }
      );

      const onWebGLFallback = vi.fn();
      const renderer = new TerminalRenderer({
        ...defaultOptions,
        webglEnabled: true,
        onWebGLFallback,
      });
      const container = document.createElement("div");

      renderer.mount(container);

      // Simulate context loss
      contextLossCallback!();

      expect(mockWebglAddonInstance.dispose).toHaveBeenCalled();
      expect(onWebGLFallback).toHaveBeenCalled();
    });
  });

  describe("connectPty()", () => {
    it("pipes pty.onData through flow controller and terminal.onData -> pty.write", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      let ptyDataCallback: ((data: string) => void) | null = null;
      let termDataCallback: ((data: string) => void) | null = null;

      const mockPty = {
        onData: vi.fn((cb: (data: string) => void) => {
          ptyDataCallback = cb;
          return { dispose: vi.fn() };
        }),
        write: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockTerminalInstance.onData as any).mockImplementation(
        (cb: (data: string) => void) => {
          termDataCallback = cb;
          return { dispose: vi.fn() };
        }
      );

      renderer.connectPty(mockPty);

      // PTY -> Terminal: data goes through flow controller -> terminal.write
      expect(mockPty.onData).toHaveBeenCalled();
      ptyDataCallback!("hello from pty");
      expect(mockTerminalInstance.write).toHaveBeenCalledWith(
        "hello from pty",
        expect.any(Function)
      );

      // Terminal -> PTY: terminal input should be written to pty
      expect(mockTerminalInstance.onData).toHaveBeenCalled();
      termDataCallback!("hello from terminal");
      expect(mockPty.write).toHaveBeenCalledWith("hello from terminal");
    });
  });

  describe("resize()", () => {
    it("calls fitAddon.fit() and returns { cols, rows }", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      const result = renderer.resize();

      expect(mockFitAddonInstance.fit).toHaveBeenCalled();
      expect(result).toEqual({ cols: 80, rows: 24 });
    });
  });

  describe("dispose()", () => {
    it("disposes terminal and all addons", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      renderer.dispose();

      expect(mockFitAddonInstance.dispose).toHaveBeenCalled();
      expect(mockWebLinksAddonInstance.dispose).toHaveBeenCalled();
      expect(mockUnicode11AddonInstance.dispose).toHaveBeenCalled();
      expect(mockSearchAddonInstance.dispose).toHaveBeenCalled();
      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });

    it("disposes WebGL addon if loaded", () => {
      const renderer = new TerminalRenderer({
        ...defaultOptions,
        webglEnabled: true,
      });
      const container = document.createElement("div");
      renderer.mount(container);

      renderer.dispose();

      expect(mockWebglAddonInstance.dispose).toHaveBeenCalled();
    });
  });

  describe("getTerminal()", () => {
    it("returns the underlying terminal instance", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      expect(renderer.getTerminal()).toBe(mockTerminalInstance);
    });
  });

  describe("search methods", () => {
    it("findNext delegates to search addon", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      renderer.findNext("test");

      expect(mockSearchAddonInstance.findNext).toHaveBeenCalledWith("test");
    });

    it("findPrevious delegates to search addon", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      renderer.findPrevious("test");

      expect(mockSearchAddonInstance.findPrevious).toHaveBeenCalledWith("test");
    });

    it("clearSearch delegates to search addon", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      renderer.clearSearch();

      expect(mockSearchAddonInstance.clearDecorations).toHaveBeenCalled();
    });
  });

  describe("clearTerminal()", () => {
    it("clears the terminal", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      renderer.clearTerminal();

      expect(mockTerminalInstance.clear).toHaveBeenCalled();
    });
  });

  describe("getSelection()", () => {
    it("returns selected text", () => {
      mockTerminalInstance.getSelection.mockReturnValue("selected text");
      const renderer = new TerminalRenderer(defaultOptions);

      expect(renderer.getSelection()).toBe("selected text");
    });
  });

  describe("hasSelection()", () => {
    it("returns whether terminal has selection", () => {
      mockTerminalInstance.hasSelection.mockReturnValue(true);
      const renderer = new TerminalRenderer(defaultOptions);

      expect(renderer.hasSelection()).toBe(true);
    });
  });

  describe("attachCustomKeyEventHandler()", () => {
    it("delegates to terminal", () => {
      const renderer = new TerminalRenderer(defaultOptions);
      const handler = vi.fn();

      renderer.attachCustomKeyEventHandler(handler);

      expect(mockTerminalInstance.attachCustomKeyEventHandler).toHaveBeenCalledWith(handler);
    });
  });
});
