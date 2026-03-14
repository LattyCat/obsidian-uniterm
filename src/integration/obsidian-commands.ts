import type { TerminalView } from "../ui/terminal-view";

export interface CommandCallbacks {
  toggleTerminal: () => void;
  focusTerminal: () => void;
  unfocusTerminal: () => void;
  clearTerminal: () => void;
  findInTerminal: () => void;
  newTab: () => void;
  closeTab: () => void;
  getActiveTerminalView: () => TerminalView | null;
}

interface PluginLike {
  addCommand(command: {
    id: string;
    name: string;
    callback?: () => void;
    checkCallback?: (checking: boolean) => boolean | void;
  }): void;
}

/** Add a command that only runs when a terminal view is active */
function addCheckCommand(
  plugin: PluginLike,
  id: string,
  name: string,
  getView: () => TerminalView | null,
  action: () => void,
): void {
  plugin.addCommand({
    id,
    name,
    checkCallback: (checking: boolean) => {
      if (!getView()) return false;
      if (!checking) action();
      return true;
    },
  });
}

/** Register all terminal commands with the Obsidian plugin */
export function registerCommands(plugin: PluginLike, callbacks: CommandCallbacks): void {
  plugin.addCommand({
    id: "toggle-terminal",
    name: "Toggle terminal panel",
    callback: () => callbacks.toggleTerminal(),
  });

  const getView = callbacks.getActiveTerminalView;

  addCheckCommand(plugin, "focus-terminal", "Focus terminal", getView, () => callbacks.focusTerminal());
  addCheckCommand(plugin, "unfocus-terminal", "Unfocus terminal", getView, () => callbacks.unfocusTerminal());
  addCheckCommand(plugin, "clear-terminal", "Clear terminal", getView, () => callbacks.clearTerminal());
  addCheckCommand(plugin, "find-in-terminal", "Find in terminal", getView, () => callbacks.findInTerminal());

  plugin.addCommand({
    id: "new-tab",
    name: "New terminal tab",
    callback: () => callbacks.newTab(),
  });

  addCheckCommand(plugin, "close-tab", "Close terminal tab", getView, () => callbacks.closeTab());
}
