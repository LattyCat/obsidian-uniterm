// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock xterm and addons before importing
const mockTerminalInstance = {
  loadAddon: vi.fn(),
  open: vi.fn(),
  write: vi.fn(),
  onData: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
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

import { Terminal } from "@xterm/xterm";
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
    it("loads fit, web-links, and unicode11 addons", () => {
      new TerminalRenderer(defaultOptions);

      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(3);
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockFitAddonInstance
      );
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockWebLinksAddonInstance
      );
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledWith(
        mockUnicode11AddonInstance
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
  });

  describe("connectPty()", () => {
    it("pipes pty.onData -> terminal.write and terminal.onData -> pty.write", () => {
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

      mockTerminalInstance.onData.mockImplementation(
        (cb: (data: string) => void) => {
          termDataCallback = cb;
          return { dispose: vi.fn() };
        }
      );

      renderer.connectPty(mockPty);

      // PTY -> Terminal: pty output should be written to terminal
      expect(mockPty.onData).toHaveBeenCalled();
      ptyDataCallback!("hello from pty");
      expect(mockTerminalInstance.write).toHaveBeenCalledWith("hello from pty");

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
      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });
  });

  describe("getTerminal()", () => {
    it("returns the underlying terminal instance", () => {
      const renderer = new TerminalRenderer(defaultOptions);

      expect(renderer.getTerminal()).toBe(mockTerminalInstance);
    });
  });
});
