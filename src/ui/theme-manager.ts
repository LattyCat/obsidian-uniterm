/** Theme colors compatible with xterm.js ITheme */
export interface ThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
}

export interface CustomThemeColors {
  background?: string;
  foreground?: string;
  cursor?: string;
  selectionBackground?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
}

export interface ComputedStyleProvider {
  getComputedStyle: (el: Element) => CSSStyleDeclaration;
}

const DARK_PALETTE: ThemeColors = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  cursor: "#d4d4d4",
  selectionBackground: "#264f78",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
};

const LIGHT_PALETTE: ThemeColors = {
  background: "#ffffff",
  foreground: "#383a42",
  cursor: "#383a42",
  selectionBackground: "#add6ff",
  black: "#000000",
  red: "#e45649",
  green: "#50a14f",
  yellow: "#c18401",
  blue: "#4078f2",
  magenta: "#a626a4",
  cyan: "#0184bc",
  white: "#fafafa",
};

/**
 * Resolve a CSS color string (which may contain calc() or var()) to a
 * simple rgba() value that xterm.js can understand, using the browser's
 * own CSS engine.  Returns "" if resolution fails.
 */
function resolveColor(raw: string): string {
  if (!raw) return "";
  // Simple hex / rgb / rgba values don't need resolution
  if (/^(#|rgb)/.test(raw)) return raw;
  try {
    const el = document.createElement("div");
    el.style.color = raw;
    el.style.display = "none";
    document.body.appendChild(el);
    const resolved = getComputedStyle(el).color; // always returns rgb()/rgba()
    el.remove();
    return resolved || "";
  } catch {
    return "";
  }
}

export class ThemeManager {
  private styleProvider: ComputedStyleProvider;

  constructor(deps: ComputedStyleProvider) {
    this.styleProvider = deps;
  }

  /** Get theme colors based on mode */
  getThemeColors(mode: "obsidian" | "dark" | "light" | "custom", customColors?: CustomThemeColors): ThemeColors {
    switch (mode) {
      case "dark":
        return { ...DARK_PALETTE };
      case "light":
        return { ...LIGHT_PALETTE };
      case "custom":
        return this.applyCustomColors(customColors);
      case "obsidian":
      default:
        return { ...DARK_PALETTE }; // fallback, real usage calls getObsidianTheme
    }
  }

  /** Extract theme colors from Obsidian's CSS variables */
  getObsidianTheme(rootEl: Element): ThemeColors {
    const style = this.styleProvider.getComputedStyle(rootEl);
    const bg = style.getPropertyValue("--background-primary").trim() || DARK_PALETTE.background;
    const fg = style.getPropertyValue("--text-normal").trim() || DARK_PALETTE.foreground;
    const accent = style.getPropertyValue("--interactive-accent").trim() || DARK_PALETTE.cursor;
    const selectionRaw = style.getPropertyValue("--text-selection").trim();
    // xterm.js cannot parse CSS calc() in color values; resolve via the browser
    const selection = resolveColor(selectionRaw) || DARK_PALETTE.selectionBackground;

    return {
      background: bg,
      foreground: fg,
      cursor: accent,
      selectionBackground: selection,
      black: DARK_PALETTE.black,
      red: DARK_PALETTE.red,
      green: DARK_PALETTE.green,
      yellow: DARK_PALETTE.yellow,
      blue: DARK_PALETTE.blue,
      magenta: DARK_PALETTE.magenta,
      cyan: DARK_PALETTE.cyan,
      white: DARK_PALETTE.white,
    };
  }

  private applyCustomColors(customColors?: CustomThemeColors): ThemeColors {
    const base = { ...DARK_PALETTE };
    if (!customColors) return base;

    return {
      background: customColors.background || base.background,
      foreground: customColors.foreground || base.foreground,
      cursor: customColors.cursor || base.cursor,
      selectionBackground: customColors.selectionBackground || base.selectionBackground,
      black: customColors.black || base.black,
      red: customColors.red || base.red,
      green: customColors.green || base.green,
      yellow: customColors.yellow || base.yellow,
      blue: customColors.blue || base.blue,
      magenta: customColors.magenta || base.magenta,
      cyan: customColors.cyan || base.cyan,
      white: customColors.white || base.white,
    };
  }
}
