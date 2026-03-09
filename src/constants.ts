import type { TerminalSettings } from "./types";

export const VIEW_TYPE_TERMINAL = "terminal-view";

export const LOG_PREFIX = "[obsidian-terminal]";

export const SHUTDOWN_TIMEOUT_MS = 3000;

export const DEFAULT_SETTINGS: TerminalSettings = {
  defaultShell: "",
  defaultCwd: "",
  maxTabs: 10,
  autoShow: false,
  confirmCodeblockExecution: true,
  scrollbackBuffer: 10000,
  fontFamily: "Menlo, Monaco, Consolas, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: "block",
  cursorBlink: true,
  theme: "obsidian",
  webglRenderer: true,
  shellProfiles: [],
  debugLog: false,
};
