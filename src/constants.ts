import type { TerminalSettings, ShellProfile, PassthroughKeybinding } from "./types";

export const VIEW_TYPE_TERMINAL = "terminal-view";

export const LOG_PREFIX = "[obsidian-terminal]";

export const SHUTDOWN_TIMEOUT_MS = 3000;

export const DEFAULT_SHIFT_ENTER_SEQUENCE = "\x1b\r";

export const DEFAULT_PASSTHROUGH_KEYBINDINGS: PassthroughKeybinding[] = [
  { key: "p", ctrlKey: true },
];

export const PRESET_PROFILES: ShellProfile[] = [
  {
    id: "default",
    name: "Default Shell",
    shellPath: "",
    shellArgs: [],
    cwd: "",
    icon: "terminal",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    shellPath: "",
    shellArgs: [],
    cwd: "",
    icon: "bot",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    shellPath: "",
    shellArgs: [],
    cwd: "",
    icon: "code",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    shellPath: "",
    shellArgs: [],
    cwd: "",
    icon: "sparkle",
  },
  {
    id: "git",
    name: "Git",
    shellPath: "",
    shellArgs: [],
    cwd: "",
    icon: "git-branch",
  },
];

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
  shiftEnterSequence: DEFAULT_SHIFT_ENTER_SEQUENCE,
  passthroughKeybindings: DEFAULT_PASSTHROUGH_KEYBINDINGS,
  debugLog: false,
};
