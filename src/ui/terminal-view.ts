import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_TERMINAL } from "../constants";

export class TerminalView extends ItemView {
  private containerEl_terminal: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_TERMINAL;
  }

  getDisplayText(): string {
    return "Terminal";
  }

  getIcon(): string {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    this.containerEl_terminal = container.createEl("div", {
      cls: "terminal-panel",
    });
  }

  async onClose(): Promise<void> {
    if (this.containerEl_terminal) {
      this.containerEl_terminal.remove();
      this.containerEl_terminal = null;
    }
  }
}
