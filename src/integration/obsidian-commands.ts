export interface CommandCallbacks {
  toggleTerminal: () => void;
  focusTerminal: () => void;
  unfocusTerminal: () => void;
  clearTerminal: () => void;
  findInTerminal: () => void;
  newTab: () => void;
  newTabWithProfile: () => void;
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
    name: "Toggle Terminal Panel",
    callback: () => callbacks.toggleTerminal(),
  });

  plugin.addCommand({
    id: "focus-terminal",
    name: "Focus Terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.focusTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "unfocus-terminal",
    name: "Unfocus Terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.unfocusTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "clear-terminal",
    name: "Clear Terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.clearTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "find-in-terminal",
    name: "Find in Terminal",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.findInTerminal();
      return true;
    },
  });

  plugin.addCommand({
    id: "new-tab",
    name: "New Terminal Tab",
    callback: () => callbacks.newTab(),
  });

  plugin.addCommand({
    id: "new-tab-profile",
    name: "New Tab with Profile",
    callback: () => callbacks.newTabWithProfile(),
  });

  plugin.addCommand({
    id: "close-tab",
    name: "Close Terminal Tab",
    checkCallback: (checking: boolean) => {
      const view = callbacks.getActiveTerminalView();
      if (!view) return false;
      if (!checking) callbacks.closeTab();
      return true;
    },
  });

}
