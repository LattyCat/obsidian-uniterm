import { describe, it, expect } from "vitest";
import { SessionState } from "../types";
import type {
  TerminalSettings,
  ElectronBridgeResult,
  PtySpawnOptions,
  SessionInfo,
  PassthroughKeybinding,
} from "../types";

describe("SessionState enum", () => {
  it("has all expected states", () => {
    expect(SessionState.Created).toBe("created");
    expect(SessionState.Initializing).toBe("initializing");
    expect(SessionState.Running).toBe("running");
    expect(SessionState.ShuttingDown).toBe("shutting_down");
    expect(SessionState.Destroyed).toBe("destroyed");
  });

  it("has exactly 5 states", () => {
    const values = Object.values(SessionState);
    expect(values).toHaveLength(5);
  });
});

describe("Type contracts", () => {
  it("TerminalSettings has all default-able fields", () => {
    const settings: TerminalSettings = {
      defaultShell: "",
      defaultCwd: "",
      autoShow: false,
      scrollbackBuffer: 10000,
      fontFamily: "monospace",
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
    };
    expect(settings.cursorStyle).toBe("block");
    expect(settings.theme).toBe("obsidian");
    expect(settings.shiftEnterSequence).toBe("\x1b\r");
    expect(settings.passthroughKeybindings).toEqual([]);
  });

  it("PassthroughKeybinding has required and optional fields", () => {
    const binding: PassthroughKeybinding = {
      key: "p",
      ctrlKey: true,
    };
    expect(binding.key).toBe("p");
    expect(binding.ctrlKey).toBe(true);
    expect(binding.shiftKey).toBeUndefined();
    expect(binding.altKey).toBeUndefined();
    expect(binding.metaKey).toBeUndefined();
  });

  it("ElectronBridgeResult can represent success", () => {
    const result: ElectronBridgeResult = { pty: { spawn: () => ({} as any) }, error: null };
    expect(result.pty).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it("ElectronBridgeResult can represent failure", () => {
    const result: ElectronBridgeResult = {
      pty: null,
      error: "Failed to load",
    };
    expect(result.pty).toBeNull();
    expect(result.error).toBe("Failed to load");
  });

  it("PtySpawnOptions has all required fields", () => {
    const opts: PtySpawnOptions = {
      shell: "/bin/zsh",
      args: [],
      cwd: "/home",
      cols: 80,
      rows: 24,
      env: { TERM: "xterm-256color" },
    };
    expect(opts.cols).toBe(80);
    expect(opts.env.TERM).toBe("xterm-256color");
  });

  it("SessionInfo exposes state", () => {
    const info: SessionInfo = {
      id: "sess-1",
      state: SessionState.Running,
    };
    expect(info.state).toBe(SessionState.Running);
  });
});
