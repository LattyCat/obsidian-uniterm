/** Minimal obsidian API mock for testing */

export class ItemView {
  leaf: any;
  contentEl: HTMLElement;
  containerEl: HTMLElement;

  constructor(leaf: any) {
    this.leaf = leaf;
    this.contentEl = createDiv();
    this.containerEl = createDiv();
  }

  getViewType(): string {
    return "";
  }

  getDisplayText(): string {
    return "";
  }

  getIcon(): string {
    return "";
  }

  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class Plugin {
  app: any;
  manifest: any;

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  registerView(_type: string, _viewCreator: (leaf: any) => any): void {}
  addRibbonIcon(
    _icon: string,
    _title: string,
    _callback: () => void
  ): HTMLElement {
    return createDiv();
  }
  addCommand(_command: any): any {}
}

export class WorkspaceLeaf {}

/** Minimal DOM helpers mimicking Obsidian's API */
function createDiv(options?: { cls?: string }): HTMLElement {
  // Use a plain object that mimics HTMLElement enough for tests
  const children: any[] = [];
  const classList = new Set<string>();
  if (options?.cls) classList.add(options.cls);

  const el: any = {
    tagName: "DIV",
    classList: {
      add: (c: string) => classList.add(c),
      remove: (c: string) => classList.delete(c),
      contains: (c: string) => classList.has(c),
    },
    children,
    appendChild: (child: any) => {
      children.push(child);
      child.parentElement = el;
      return child;
    },
    remove: function () {
      if (this.parentElement) {
        const idx = this.parentElement.children.indexOf(this);
        if (idx >= 0) this.parentElement.children.splice(idx, 1);
      }
    },
    querySelector: (selector: string) => {
      // Very simple class-based selector
      const match = selector.match(/^\.(.+)$/);
      if (match) {
        const cls = match[1];
        return children.find(
          (c: any) => c.classList && c.classList.contains(cls)
        ) || null;
      }
      return null;
    },
    createEl: (tag: string, opts?: { cls?: string }) => {
      const child: any = createDiv(opts);
      child.tagName = tag.toUpperCase();
      el.appendChild(child);
      return child;
    },
    parentElement: null as any,
  };

  return el;
}
