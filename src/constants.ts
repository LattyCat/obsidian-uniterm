import type { TerminalSettings, PassthroughKeybinding, CustomThemeColors } from "./types";

export const VIEW_TYPE_TERMINAL = "terminal-view";

export const LOG_PREFIX = "[obsidian-uniterm]";

export const SHUTDOWN_TIMEOUT_MS = 3000;

export const MIN_PANEL_HEIGHT = 100;
export const MAX_PANEL_HEIGHT_RATIO = 0.8;

export const DEFAULT_SHIFT_ENTER_SEQUENCE = "\x1b\r";

export const DEFAULT_PASSTHROUGH_KEYBINDINGS: PassthroughKeybinding[] = [
  { key: "p", ctrlKey: true },
];

export const DEFAULT_SETTINGS: TerminalSettings = {
  defaultShell: "",
  defaultCwd: "",
  autoShow: false,
  scrollbackBuffer: 10000,
  fontFamily: "Menlo, Monaco, Consolas, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: "block",
  cursorBlink: true,
  theme: "obsidian",
  webglRenderer: true,
  shiftEnterSequence: DEFAULT_SHIFT_ENTER_SEQUENCE,
  passthroughKeybindings: DEFAULT_PASSTHROUGH_KEYBINDINGS,
  debugLog: false,
  consentGiven: false,
  customThemeColors: {},
  screenReaderMode: false,
  panelHeight: 300,
};
