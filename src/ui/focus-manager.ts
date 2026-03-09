export class FocusManager {
  private focused = false;
  private bodyClassList: DOMTokenList;
  private restoreFocusFn: () => void;

  constructor(deps: { bodyClassList: DOMTokenList; restoreFocus: () => void }) {
    this.bodyClassList = deps.bodyClassList;
    this.restoreFocusFn = deps.restoreFocus;
  }

  get isFocused(): boolean {
    return this.focused;
  }

  focus(): void {
    if (this.focused) return;
    this.focused = true;
    this.bodyClassList.add("terminal-focused");
  }

  unfocus(): void {
    if (!this.focused) return;
    this.focused = false;
    this.bodyClassList.remove("terminal-focused");
    this.restoreFocusFn();
  }

  dispose(): void {
    if (this.focused) {
      this.unfocus();
    }
  }
}
