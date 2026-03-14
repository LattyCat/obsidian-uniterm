import { describe, it, expect } from "vitest";
import {
  VIEW_TYPE_TERMINAL,
  LOG_PREFIX,
  SHUTDOWN_TIMEOUT_MS,
  MIN_PANEL_HEIGHT,
  MAX_PANEL_HEIGHT_RATIO,
  DEFAULT_SETTINGS,
  DEFAULT_SHIFT_ENTER_SEQUENCE,
  DEFAULT_PASSTHROUGH_KEYBINDINGS,
  PRESET_PROFILES,
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

  it("has default shiftEnterSequence", () => {
    expect(DEFAULT_SETTINGS.shiftEnterSequence).toBe(
      DEFAULT_SHIFT_ENTER_SEQUENCE
    );
  });

  it("has default passthroughKeybindings", () => {
    expect(DEFAULT_SETTINGS.passthroughKeybindings).toEqual(
      DEFAULT_PASSTHROUGH_KEYBINDINGS
    );
  });
});

describe("MIN_PANEL_HEIGHT", () => {
  it("is 100", () => {
    expect(MIN_PANEL_HEIGHT).toBe(100);
  });
});

describe("MAX_PANEL_HEIGHT_RATIO", () => {
  it("is 0.8", () => {
    expect(MAX_PANEL_HEIGHT_RATIO).toBe(0.8);
  });
});

describe("DEFAULT_SETTINGS panelHeight", () => {
  it("has panelHeight of 300", () => {
    expect(DEFAULT_SETTINGS.panelHeight).toBe(300);
  });
});

describe("DEFAULT_SHIFT_ENTER_SEQUENCE", () => {
  it("is ESC + CR", () => {
    expect(DEFAULT_SHIFT_ENTER_SEQUENCE).toBe("\x1b\r");
  });
});

describe("DEFAULT_PASSTHROUGH_KEYBINDINGS", () => {
  it("includes Ctrl+P", () => {
    expect(DEFAULT_PASSTHROUGH_KEYBINDINGS).toContainEqual({
      key: "p",
      ctrlKey: true,
    });
  });
});

describe("PRESET_PROFILES", () => {
  it("has 5 preset profiles", () => {
    expect(PRESET_PROFILES).toHaveLength(5);
  });

  it("includes default, claude-code, codex-cli, gemini-cli, git", () => {
    const ids = PRESET_PROFILES.map((p) => p.id);
    expect(ids).toContain("default");
    expect(ids).toContain("claude-code");
    expect(ids).toContain("codex-cli");
    expect(ids).toContain("gemini-cli");
    expect(ids).toContain("git");
  });

  it("all presets have empty shellPath for auto-detect", () => {
    for (const profile of PRESET_PROFILES) {
      expect(profile.shellPath).toBe("");
    }
  });
});
