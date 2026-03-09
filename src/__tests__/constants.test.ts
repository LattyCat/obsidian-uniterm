import { describe, it, expect } from "vitest";
import {
  VIEW_TYPE_TERMINAL,
  LOG_PREFIX,
  SHUTDOWN_TIMEOUT_MS,
  DEFAULT_SETTINGS,
} from "../constants";

describe("VIEW_TYPE_TERMINAL", () => {
  it("is a non-empty string", () => {
    expect(VIEW_TYPE_TERMINAL).toBe("terminal-view");
  });
});

describe("LOG_PREFIX", () => {
  it("follows the [obsidian-terminal] format", () => {
    expect(LOG_PREFIX).toBe("[obsidian-terminal]");
  });
});

describe("SHUTDOWN_TIMEOUT_MS", () => {
  it("is 3 seconds", () => {
    expect(SHUTDOWN_TIMEOUT_MS).toBe(3000);
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("has empty defaultShell (auto-detect)", () => {
    expect(DEFAULT_SETTINGS.defaultShell).toBe("");
  });

  it("has maxTabs of 10", () => {
    expect(DEFAULT_SETTINGS.maxTabs).toBe(10);
  });

  it("has scrollbackBuffer of 10000", () => {
    expect(DEFAULT_SETTINGS.scrollbackBuffer).toBe(10000);
  });

  it("has fontSize of 14", () => {
    expect(DEFAULT_SETTINGS.fontSize).toBe(14);
  });

  it("has block cursor style", () => {
    expect(DEFAULT_SETTINGS.cursorStyle).toBe("block");
  });

  it("has obsidian theme by default", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("obsidian");
  });

  it("has webglRenderer enabled", () => {
    expect(DEFAULT_SETTINGS.webglRenderer).toBe(true);
  });

  it("has empty shellProfiles", () => {
    expect(DEFAULT_SETTINGS.shellProfiles).toEqual([]);
  });

  it("has autoShow disabled", () => {
    expect(DEFAULT_SETTINGS.autoShow).toBe(false);
  });

  it("has confirmCodeblockExecution enabled", () => {
    expect(DEFAULT_SETTINGS.confirmCodeblockExecution).toBe(true);
  });

  it("has debugLog disabled", () => {
    expect(DEFAULT_SETTINGS.debugLog).toBe(false);
  });

  it("has Menlo-based font family", () => {
    expect(DEFAULT_SETTINGS.fontFamily).toContain("Menlo");
  });

  it("has lineHeight of 1.2", () => {
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.2);
  });

  it("has cursorBlink enabled", () => {
    expect(DEFAULT_SETTINGS.cursorBlink).toBe(true);
  });
});
