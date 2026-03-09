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
  addSettingTab(_tab: any): void {}
  async loadData(): Promise<any> { return null; }
  async saveData(_data: any): Promise<void> {}
  registerEvent(_event: any): void {}
}

export class WorkspaceLeaf {}

export class Modal {
  app: any;
  contentEl: HTMLElement;
  modalEl: HTMLElement;

  constructor(app: any) {
    this.app = app;
    this.contentEl = createDiv();
    this.modalEl = createDiv();
  }

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = createDiv();
  }

  display(): void {}
  hide(): void {}
}

export class Setting {
  settingEl: HTMLElement;
  private _name: string = "";
  private _desc: string = "";

  constructor(containerEl: HTMLElement) {
    this.settingEl = createDiv();
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    this._name = name;
    return this;
  }

  setDesc(desc: string): this {
    this._desc = desc;
    return this;
  }

  addText(cb: (text: any) => void): this {
    const text = {
      value: "",
      setValue: function(v: string) { this.value = v; return this; },
      setPlaceholder: function(_p: string) { return this; },
      onChange: function(_fn: (value: string) => void) { return this; },
      inputEl: createDiv(),
    };
    cb(text);
    return this;
  }

  addToggle(cb: (toggle: any) => void): this {
    const toggle = {
      value: false,
      setValue: function(v: boolean) { this.value = v; return this; },
      onChange: function(_fn: (value: boolean) => void) { return this; },
    };
    cb(toggle);
    return this;
  }

  addDropdown(cb: (dropdown: any) => void): this {
    const dropdown = {
      value: "",
      addOption: function(_value: string, _display: string) { return this; },
      setValue: function(v: string) { this.value = v; return this; },
      onChange: function(_fn: (value: string) => void) { return this; },
    };
    cb(dropdown);
    return this;
  }

  addSlider(cb: (slider: any) => void): this {
    const slider = {
      value: 0,
      setLimits: function(_min: number, _max: number, _step: number) { return this; },
      setValue: function(v: number) { this.value = v; return this; },
      setDynamicTooltip: function() { return this; },
      onChange: function(_fn: (value: number) => void) { return this; },
    };
    cb(slider);
    return this;
  }

  setHeading(): this {
    return this;
  }
}

/** Minimal DOM helpers mimicking Obsidian's API */
function createDiv(options?: { cls?: string; text?: string }): HTMLElement {
  const children: any[] = [];
  const classList = new Set<string>();
  if (options?.cls) classList.add(options.cls);

  const eventListeners: Record<string, Function[]> = {};

  const el: any = {
    tagName: "DIV",
    textContent: options?.text || "",
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
      const match = selector.match(/^\.(.+)$/);
      if (match) {
        const cls = match[1];
        return children.find(
          (c: any) => c.classList && c.classList.contains(cls)
        ) || null;
      }
      return null;
    },
    createEl: (tag: string, opts?: { cls?: string; text?: string }) => {
      const child: any = createDiv(opts);
      child.tagName = tag.toUpperCase();
      el.appendChild(child);
      return child;
    },
    empty: function () {
      children.length = 0;
    },
    addEventListener: (event: string, handler: Function) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    },
    _eventListeners: eventListeners,
    setAttribute: (_name: string, _value: string) => {},
    parentElement: null as any,
  };

  return el;
}
