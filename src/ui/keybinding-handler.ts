import type { PassthroughKeybinding } from "../types";

export interface KeybindingAction {
  id: string;
  match: (e: KeyboardEvent) => boolean;
  execute: () => void;
}

export class KeybindingHandler {
  private writeToPty: (data: string) => void;
  private focusManager: { unfocus: () => void };
  private shiftEnterSequence: string;
  private passthroughKeybindings: PassthroughKeybinding[];
  private platform: string;
  private actions: KeybindingAction[] = [];
  private handledKeys = new Set<string>();

  constructor(options: {
    writeToPty: (data: string) => void;
    focusManager: { unfocus: () => void };
    shiftEnterSequence: string;
    passthroughKeybindings: PassthroughKeybinding[];
    platform: string;
  }) {
    this.writeToPty = options.writeToPty;
    this.focusManager = options.focusManager;
    this.shiftEnterSequence = options.shiftEnterSequence;
    this.passthroughKeybindings = options.passthroughKeybindings;
    this.platform = options.platform;
  }

  registerAction(action: KeybindingAction): void {
    this.actions.push(action);
  }

  handle(event: KeyboardEvent): boolean {
    const keyId = this.keyId(event);

    // Rule 1: Non-keydown events
    if (event.type !== "keydown") {
      if (event.type === "keyup" && this.handledKeys.has(keyId)) {
        this.handledKeys.delete(keyId);
        this.suppressEvent(event);
        return false;
      }
      return true;
    }

    // Rule 2: Shift+Enter
    if (event.shiftKey && event.key === "Enter") {
      this.writeToPty(this.shiftEnterSequence);
      this.handledKeys.add(keyId);
      this.suppressEvent(event);
      return false;
    }

    // Rule 3: Registered actions
    for (const action of this.actions) {
      if (action.match(event)) {
        action.execute();
        this.handledKeys.add(keyId);
        this.suppressEvent(event);
        return false;
      }
    }

    // Rule 4: Passthrough keybindings
    if (this.matchesPassthrough(event)) {
      return false;
    }

    // Rule 5: Ctrl+Escape
    if (event.ctrlKey && event.key === "Escape") {
      this.focusManager.unfocus();
      this.handledKeys.add(keyId);
      this.suppressEvent(event);
      return false;
    }

    // Rule 6: Meta key (Cmd on macOS)
    if (event.metaKey) {
      return false;
    }

    // Rule 7: Ctrl+Shift+*
    if (event.ctrlKey && event.shiftKey) {
      return false;
    }

    // Rule 8: Default - let xterm handle
    return true;
  }

  private suppressEvent(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private keyId(event: KeyboardEvent): string {
    return `${event.ctrlKey}-${event.shiftKey}-${event.altKey}-${event.metaKey}-${event.key}`;
  }

  private matchesPassthrough(event: KeyboardEvent): boolean {
    return this.passthroughKeybindings.some(
      (binding) =>
        binding.key === event.key &&
        (binding.ctrlKey ?? false) === event.ctrlKey &&
        (binding.shiftKey ?? false) === event.shiftKey &&
        (binding.altKey ?? false) === event.altKey &&
        (binding.metaKey ?? false) === event.metaKey,
    );
  }
}
