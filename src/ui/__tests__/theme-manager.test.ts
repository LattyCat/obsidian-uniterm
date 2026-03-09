import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeManager, ComputedStyleProvider, ThemeColors } from "../theme-manager";

function createMockStyleProvider(cssVars: Record<string, string> = {}): ComputedStyleProvider {
  return {
    getComputedStyle: vi.fn((_el: Element) => ({
      getPropertyValue: (prop: string) => cssVars[prop] || "",
    })) as any,
  };
}

const ANSI_COLOR_FIELDS = [
  "background", "foreground", "cursor", "selectionBackground",
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
] as const;

describe("ThemeManager", () => {
  let provider: ComputedStyleProvider;
  let manager: ThemeManager;

  beforeEach(() => {
    provider = createMockStyleProvider();
    manager = new ThemeManager(provider);
  });

  it("constructor accepts ComputedStyleProvider dependency", () => {
    const tm = new ThemeManager(provider);
    expect(tm).toBeInstanceOf(ThemeManager);
  });

  describe("getThemeColors", () => {
    it("returns dark palette for 'dark' mode", () => {
      const colors = manager.getThemeColors("dark");
      expect(colors.background).toBe("#1e1e1e");
      expect(colors.foreground).toBe("#d4d4d4");
    });

    it("returns light palette for 'light' mode", () => {
      const colors = manager.getThemeColors("light");
      expect(colors.background).toBe("#ffffff");
      expect(colors.foreground).toBe("#383a42");
    });

    it("returns dark palette defaults for 'custom' with no custom colors", () => {
      const colors = manager.getThemeColors("custom");
      expect(colors.background).toBe("#1e1e1e");
      expect(colors.foreground).toBe("#d4d4d4");
    });

    it("overrides only specified colors for 'custom' with partial custom colors", () => {
      const colors = manager.getThemeColors("custom", {
        background: "#222222",
        red: "#ff0000",
      });
      expect(colors.background).toBe("#222222");
      expect(colors.red).toBe("#ff0000");
      // Non-specified should remain default
      expect(colors.foreground).toBe("#d4d4d4");
      expect(colors.green).toBe("#0dbc79");
    });

    it("uses all custom values when all colors provided", () => {
      const allCustom = {
        background: "#111111",
        foreground: "#222222",
        cursor: "#333333",
        selectionBackground: "#444444",
        black: "#000001",
        red: "#ff0001",
        green: "#00ff01",
        yellow: "#ffff01",
        blue: "#0000ff",
        magenta: "#ff00ff",
        cyan: "#00ffff",
        white: "#fffffe",
      };
      const colors = manager.getThemeColors("custom", allCustom);
      for (const key of ANSI_COLOR_FIELDS) {
        expect(colors[key]).toBe(allCustom[key]);
      }
    });

    it("returns dark palette fallback for 'obsidian' mode", () => {
      const colors = manager.getThemeColors("obsidian");
      expect(colors.background).toBe("#1e1e1e");
      expect(colors.foreground).toBe("#d4d4d4");
    });
  });

  describe("getObsidianTheme", () => {
    it("reads CSS variables from computed style", () => {
      const cssProvider = createMockStyleProvider({
        "--background-primary": "#282c34",
        "--text-normal": "#abb2bf",
        "--interactive-accent": "#61afef",
        "--text-selection": "#3e4451",
      });
      const tm = new ThemeManager(cssProvider);
      const rootEl = {} as Element;
      const colors = tm.getObsidianTheme(rootEl);

      expect(cssProvider.getComputedStyle).toHaveBeenCalledWith(rootEl);
      expect(colors.background).toBe("#282c34");
      expect(colors.foreground).toBe("#abb2bf");
      expect(colors.cursor).toBe("#61afef");
      expect(colors.selectionBackground).toBe("#3e4451");
    });

    it("falls back to dark palette when CSS vars are empty", () => {
      const rootEl = {} as Element;
      const colors = manager.getObsidianTheme(rootEl);

      expect(colors.background).toBe("#1e1e1e");
      expect(colors.foreground).toBe("#d4d4d4");
      expect(colors.cursor).toBe("#d4d4d4");
      expect(colors.selectionBackground).toBe("#264f78");
    });

    it("reads --background-primary for background", () => {
      const cssProvider = createMockStyleProvider({
        "--background-primary": "#custom-bg",
      });
      const tm = new ThemeManager(cssProvider);
      const colors = tm.getObsidianTheme({} as Element);
      expect(colors.background).toBe("#custom-bg");
    });

    it("reads --text-normal for foreground", () => {
      const cssProvider = createMockStyleProvider({
        "--text-normal": "#custom-fg",
      });
      const tm = new ThemeManager(cssProvider);
      const colors = tm.getObsidianTheme({} as Element);
      expect(colors.foreground).toBe("#custom-fg");
    });

    it("reads --interactive-accent for cursor", () => {
      const cssProvider = createMockStyleProvider({
        "--interactive-accent": "#custom-cursor",
      });
      const tm = new ThemeManager(cssProvider);
      const colors = tm.getObsidianTheme({} as Element);
      expect(colors.cursor).toBe("#custom-cursor");
    });

    it("reads --text-selection for selectionBackground", () => {
      const cssProvider = createMockStyleProvider({
        "--text-selection": "#custom-sel",
      });
      const tm = new ThemeManager(cssProvider);
      const colors = tm.getObsidianTheme({} as Element);
      expect(colors.selectionBackground).toBe("#custom-sel");
    });

    it("uses LIGHT_PALETTE ANSI colors when rootEl has theme-light class", () => {
      const lightRoot = { classList: { contains: (c: string) => c === "theme-light" } } as unknown as Element;
      const colors = manager.getObsidianTheme(lightRoot);
      expect(colors.yellow).toBe("#c18401");
      expect(colors.red).toBe("#e45649");
      expect(colors.green).toBe("#50a14f");
      expect(colors.blue).toBe("#4078f2");
    });

    it("uses DARK_PALETTE ANSI colors when rootEl has theme-dark class", () => {
      const darkRoot = { classList: { contains: (c: string) => c === "theme-dark" } } as unknown as Element;
      const colors = manager.getObsidianTheme(darkRoot);
      expect(colors.yellow).toBe("#e5e510");
      expect(colors.red).toBe("#cd3131");
      expect(colors.green).toBe("#0dbc79");
      expect(colors.blue).toBe("#2472c8");
    });

    it("falls back to DARK_PALETTE when classList is absent", () => {
      const noClassList = {} as Element;
      const colors = manager.getObsidianTheme(noClassList);
      expect(colors.yellow).toBe("#e5e510");
      expect(colors.red).toBe("#cd3131");
    });
  });

  it("theme colors object has all required ANSI color fields", () => {
    const colors = manager.getThemeColors("dark");
    for (const field of ANSI_COLOR_FIELDS) {
      expect(colors).toHaveProperty(field);
      expect(typeof colors[field]).toBe("string");
    }
  });

  it("dark and light palettes are different objects (not same reference)", () => {
    const dark1 = manager.getThemeColors("dark");
    const dark2 = manager.getThemeColors("dark");
    const light = manager.getThemeColors("light");

    expect(dark1).not.toBe(dark2);
    expect(dark1).not.toBe(light);
    expect(dark1.background).not.toBe(light.background);
  });
});
