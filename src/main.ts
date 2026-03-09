import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TERMINAL } from "./constants";
import { TerminalView } from "./ui/terminal-view";
import { SessionManager } from "./core/session-manager";

export default class TerminalPlugin extends Plugin {
  sessionManager: SessionManager = new SessionManager();

  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_TERMINAL, (leaf: WorkspaceLeaf) => {
      return new TerminalView(leaf);
    });

    this.addRibbonIcon("terminal", "Open Terminal", () => {
      this.toggleTerminalPanel();
    });

    this.addCommand({
      id: "toggle-terminal",
      name: "Toggle Terminal Panel",
      callback: () => {
        this.toggleTerminalPanel();
      },
    });
  }

  async onunload(): Promise<void> {
    await this.sessionManager.destroyAll();
  }

  async toggleTerminalPanel(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TERMINAL);

    if (existing.length > 0) {
      // Activate the first existing terminal leaf
      this.app.workspace.revealLeaf(existing[0]);
    } else {
      // Create a new terminal leaf in the right split
      const leaf = this.app.workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_TERMINAL,
          active: true,
        });
        this.app.workspace.revealLeaf(leaf);
      }
    }
  }
}
