export interface CommandCallbacks {
  toggleTerminal: () => void;
  focusTerminal: () => void;
  unfocusTerminal: () => void;
  clearTerminal: () => void;
  findInTerminal: () => void;
  newTab: () => void;
  closeTab: () => void;
  getActiveTerminalView: () => any | null;
}

interface PluginLike {
  addCommand(command: {
    id: string;
    name: string;
    callback?: () => void;
    checkCallback?: (checking: boolean) => boolean | void;
  }): void;
}

/** Register all terminal commands with the Obsidian plugin */
export function registerCommands(plugin: PluginLike, callbacks: CommandCallbacks): void {
  plugin.addCommand({
    id: "toggle-terminal",
    name: "Toggle terminal panel",
    callback: () => callbacks.toggleTerminal(),
  });

  plugin.addCommand({
    id: "focus-terminal",
    name: "Focus terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.focusTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "unfocus-terminal",
    name: "Unfocus terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.unfocusTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "clear-terminal",
    name: "Clear terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.clearTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "find-in-terminal",
    name: "Find in terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.findInTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "new-tab",
    name: "New terminal tab",
    callback: () => callbacks.newTab(),
  });

  plugin.addCommand({
    id: "close-tab",
    name: "Close terminal tab",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.closeTab();
      return true;
    },
  });

}
