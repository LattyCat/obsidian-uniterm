import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadSettings, saveSettings, PluginDataAdapter } from "../settings-data";
import { DEFAULT_SETTINGS } from "../../constants";
import type { TerminalSettings } from "../../types";

function createMockPlugin(data: any = null): PluginDataAdapter {
  return {
    loadData: vi.fn().mockResolvedValue(data),
    saveData: vi.fn().mockResolvedValue(undefined),
  };
}

describe("settings-data", () => {
  describe("loadSettings", () => {
    it("returns DEFAULT_SETTINGS when loadData returns null", async () => {
      const plugin = createMockPlugin(null);
      const result = await loadSettings(plugin);
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("returns DEFAULT_SETTINGS when loadData returns undefined", async () => {
      const plugin = createMockPlugin(undefined);
      const result = await loadSettings(plugin);
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("merges saved data with defaults (partial settings preserved)", async () => {
      const plugin = createMockPlugin({ fontSize: 18, cursorBlink: false });
      const result = await loadSettings(plugin);
      expect(result.fontSize).toBe(18);
      expect(result.cursorBlink).toBe(false);
      expect(result.defaultShell).toBe(DEFAULT_SETTINGS.defaultShell);
    });

    it("preserves new fields when old data lacks them (consentGiven)", async () => {
      const plugin = createMockPlugin({ fontSize: 14 });
      const result = await loadSettings(plugin);
      expect(result.consentGiven).toBe(false);
    });

    it("preserves new fields when old data lacks them (customThemeColors)", async () => {
      const plugin = createMockPlugin({ fontSize: 14 });
      const result = await loadSettings(plugin);
      expect(result.customThemeColors).toEqual({});
    });

    it("preserves new fields when old data lacks them (screenReaderMode)", async () => {
      const plugin = createMockPlugin({ fontSize: 14 });
      const result = await loadSettings(plugin);
      expect(result.screenReaderMode).toBe(false);
    });

    it("preserves saved values when they exist", async () => {
      const plugin = createMockPlugin({
        consentGiven: true,
        customThemeColors: { background: "#000" },
        screenReaderMode: true,
      });
      const result = await loadSettings(plugin);
      expect(result.consentGiven).toBe(true);
      expect(result.customThemeColors).toEqual({ background: "#000" });
      expect(result.screenReaderMode).toBe(true);
    });

    it("handles all field types (strings, numbers, booleans, arrays, objects)", async () => {
      const plugin = createMockPlugin({
        defaultShell: "/bin/zsh",
        fontSize: 20,
        cursorBlink: true,
        shellProfiles: [{ id: "test", name: "Test", shellPath: "/bin/sh", shellArgs: [], cwd: "", icon: "terminal" }],
        customThemeColors: { foreground: "#fff", cursor: "#0f0" },
      });
      const result = await loadSettings(plugin);
      expect(result.defaultShell).toBe("/bin/zsh");
      expect(result.fontSize).toBe(20);
      expect(result.cursorBlink).toBe(true);
      expect(result.shellProfiles).toHaveLength(1);
      expect(result.shellProfiles[0].id).toBe("test");
      expect(result.customThemeColors.foreground).toBe("#fff");
      expect(result.customThemeColors.cursor).toBe("#0f0");
    });

    it("returns a new object, not a reference to DEFAULT_SETTINGS", async () => {
      const plugin = createMockPlugin(null);
      const result = await loadSettings(plugin);
      expect(result).not.toBe(DEFAULT_SETTINGS);
    });
  });

  describe("saveSettings", () => {
    it("calls plugin.saveData with the settings object", async () => {
      const plugin = createMockPlugin();
      const settings = { ...DEFAULT_SETTINGS };
      await saveSettings(plugin, settings);
      expect(plugin.saveData).toHaveBeenCalledOnce();
    });

    it("passes complete settings object to saveData", async () => {
      const plugin = createMockPlugin();
      const settings: TerminalSettings = {
        ...DEFAULT_SETTINGS,
        fontSize: 22,
        consentGiven: true,
      };
      await saveSettings(plugin, settings);
      expect(plugin.saveData).toHaveBeenCalledWith(settings);
    });
  });

  describe("round-trip", () => {
    it("save then load returns same settings", async () => {
      let storedData: any = null;
      const plugin: PluginDataAdapter = {
        loadData: vi.fn().mockImplementation(() => Promise.resolve(storedData)),
        saveData: vi.fn().mockImplementation((data: any) => {
          storedData = data;
          return Promise.resolve();
        }),
      };

      const settings: TerminalSettings = {
        ...DEFAULT_SETTINGS,
        fontSize: 18,
        consentGiven: true,
        customThemeColors: { background: "#1a1a1a", foreground: "#e0e0e0" },
        screenReaderMode: true,
      };

      await saveSettings(plugin, settings);
      const loaded = await loadSettings(plugin);
      expect(loaded).toEqual(settings);
    });
  });
});
