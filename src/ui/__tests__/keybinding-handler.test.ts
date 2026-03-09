/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeybindingHandler } from "../keybinding-handler";
import type { PassthroughKeybinding } from "../../types";

function createEvent(
  type: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent(type, init);
  vi.spyOn(event, "preventDefault");
  vi.spyOn(event, "stopPropagation");
  return event;
}

function keyId(e: KeyboardEvent): string {
  return `${e.ctrlKey}-${e.shiftKey}-${e.altKey}-${e.metaKey}-${e.key}`;
}

describe("KeybindingHandler", () => {
  let writeToPty: ReturnType<typeof vi.fn>;
  let unfocus: ReturnType<typeof vi.fn>;
  let handler: KeybindingHandler;

  const defaultPassthrough: PassthroughKeybinding[] = [
    { key: "p", ctrlKey: true },
  ];

  beforeEach(() => {
    writeToPty = vi.fn();
    unfocus = vi.fn();
    handler = new KeybindingHandler({
      writeToPty,
      focusManager: { unfocus },
      shiftEnterSequence: "\x1b\r",
      passthroughKeybindings: defaultPassthrough,
      platform: "darwin",
    });
  });

  // ─── Rule 1: Non-keydown events ───

  describe("non-keydown events", () => {
    it("returns true for keyup when key was NOT handled on keydown", () => {
      const event = createEvent("keyup", { key: "a" });
      expect(handler.handle(event)).toBe(true);
    });

    it("returns false for keyup when key WAS handled on keydown", () => {
      // First handle shift+enter on keydown (rule 2) to add to handledKeys
      const keydown = createEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      handler.handle(keydown);

      // Now keyup for the same key combo should return false and remove from set
      const keyup = createEvent("keyup", { key: "Enter", shiftKey: true });
      expect(handler.handle(keyup)).toBe(false);
      expect(keyup.preventDefault).toHaveBeenCalled();
      expect(keyup.stopPropagation).toHaveBeenCalled();
    });

    it("removes key from handledKeys after keyup", () => {
      const keydown = createEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      handler.handle(keydown);

      const keyup1 = createEvent("keyup", { key: "Enter", shiftKey: true });
      expect(handler.handle(keyup1)).toBe(false);

      // Second keyup should return true since key was already removed
      const keyup2 = createEvent("keyup", { key: "Enter", shiftKey: true });
      expect(handler.handle(keyup2)).toBe(true);
    });

    it("returns true for non-keydown/non-keyup events (e.g. keypress)", () => {
      const event = createEvent("keypress", { key: "a" });
      expect(handler.handle(event)).toBe(true);
    });
  });

  // ─── Rule 2: Shift+Enter ───

  describe("Shift+Enter", () => {
    it("writes shiftEnterSequence to pty and returns false", () => {
      const event = createEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      const result = handler.handle(event);

      expect(writeToPty).toHaveBeenCalledWith("\x1b\r");
      expect(result).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("adds key to handledKeys", () => {
      const keydown = createEvent("keydown", {
        key: "Enter",
        shiftKey: true,
      });
      handler.handle(keydown);

      // Verify via keyup returning false
      const keyup = createEvent("keyup", { key: "Enter", shiftKey: true });
      expect(handler.handle(keyup)).toBe(false);
    });
  });

  // ─── Rule 3: Registered actions ───

  describe("registered actions", () => {
    it("executes matching action and returns false", () => {
      const execute = vi.fn();
      handler.registerAction({
        id: "test-action",
        match: (e) => e.key === "k" && e.ctrlKey,
        execute,
      });

      const event = createEvent("keydown", { key: "k", ctrlKey: true });
      const result = handler.handle(event);

      expect(execute).toHaveBeenCalled();
      expect(result).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("does not execute non-matching actions", () => {
      const execute = vi.fn();
      handler.registerAction({
        id: "test-action",
        match: (e) => e.key === "k" && e.ctrlKey,
        execute,
      });

      const event = createEvent("keydown", { key: "j", ctrlKey: true });
      // This will fall through to other rules, not execute the action
      handler.handle(event);
      expect(execute).not.toHaveBeenCalled();
    });

    it("first matching action wins", () => {
      const execute1 = vi.fn();
      const execute2 = vi.fn();
      handler.registerAction({
        id: "action-1",
        match: (e) => e.key === "k",
        execute: execute1,
      });
      handler.registerAction({
        id: "action-2",
        match: (e) => e.key === "k",
        execute: execute2,
      });

      const event = createEvent("keydown", { key: "k" });
      handler.handle(event);

      expect(execute1).toHaveBeenCalled();
      expect(execute2).not.toHaveBeenCalled();
    });

    it("adds key to handledKeys on action match", () => {
      handler.registerAction({
        id: "test-action",
        match: (e) => e.key === "k" && e.ctrlKey,
        execute: vi.fn(),
      });

      handler.handle(createEvent("keydown", { key: "k", ctrlKey: true }));
      expect(
        handler.handle(createEvent("keyup", { key: "k", ctrlKey: true })),
      ).toBe(false);
    });
  });

  // ─── Rule 4: Passthrough keybindings ───

  describe("passthrough keybindings", () => {
    it("returns false for matching passthrough keybinding (Ctrl+P)", () => {
      const event = createEvent("keydown", { key: "p", ctrlKey: true });
      expect(handler.handle(event)).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("returns true when passthrough does not match", () => {
      const event = createEvent("keydown", { key: "p" }); // no ctrlKey
      expect(handler.handle(event)).toBe(true);
    });

    it("matches passthrough with multiple modifiers", () => {
      const h = new KeybindingHandler({
        writeToPty: vi.fn(),
        focusManager: { unfocus: vi.fn() },
        shiftEnterSequence: "\x1b\r",
        passthroughKeybindings: [
          { key: "s", ctrlKey: true, shiftKey: true },
        ],
        platform: "darwin",
      });

      const event = createEvent("keydown", {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(h.handle(event)).toBe(false);
    });

    it("does not match when modifier differs from binding", () => {
      const event = createEvent("keydown", {
        key: "p",
        ctrlKey: true,
        shiftKey: true,
      });
      // defaultPassthrough has { key: "p", ctrlKey: true } with shiftKey defaulting to false
      expect(handler.handle(event)).toBe(false); // falls through to rule 7 (ctrl+shift)
    });
  });

  // ─── Rule 5: Ctrl+Escape ───

  describe("Ctrl+Escape", () => {
    it("calls focusManager.unfocus() and returns false", () => {
      const event = createEvent("keydown", {
        key: "Escape",
        ctrlKey: true,
      });
      const result = handler.handle(event);

      expect(unfocus).toHaveBeenCalled();
      expect(result).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("adds key to handledKeys", () => {
      handler.handle(
        createEvent("keydown", { key: "Escape", ctrlKey: true }),
      );
      expect(
        handler.handle(
          createEvent("keyup", { key: "Escape", ctrlKey: true }),
        ),
      ).toBe(false);
    });
  });

  // ─── Rule 6: Meta key (Cmd on macOS) ───

  describe("meta key", () => {
    it("returns false when metaKey is pressed", () => {
      const event = createEvent("keydown", { key: "c", metaKey: true });
      expect(handler.handle(event)).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("returns false for any key with meta modifier", () => {
      const event = createEvent("keydown", { key: "v", metaKey: true });
      expect(handler.handle(event)).toBe(false);
    });
  });

  // ─── Rule 7: Ctrl+Shift+* ───

  describe("Ctrl+Shift combinations", () => {
    it("returns false for Ctrl+Shift+T", () => {
      const event = createEvent("keydown", {
        key: "T",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(handler.handle(event)).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("returns false for Ctrl+Shift+C", () => {
      const event = createEvent("keydown", {
        key: "C",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(handler.handle(event)).toBe(false);
    });
  });

  // ─── Rule 8: Default (let xterm handle) ───

  describe("default passthrough to xterm", () => {
    it("returns true for regular letter keys", () => {
      expect(handler.handle(createEvent("keydown", { key: "a" }))).toBe(true);
      expect(handler.handle(createEvent("keydown", { key: "z" }))).toBe(true);
    });

    it("returns true for arrow keys", () => {
      expect(
        handler.handle(createEvent("keydown", { key: "ArrowUp" })),
      ).toBe(true);
      expect(
        handler.handle(createEvent("keydown", { key: "ArrowDown" })),
      ).toBe(true);
    });

    it("returns true for Enter without shift", () => {
      expect(
        handler.handle(createEvent("keydown", { key: "Enter" })),
      ).toBe(true);
    });

    it("returns true for Ctrl+C (no shift, not passthrough)", () => {
      expect(
        handler.handle(createEvent("keydown", { key: "c", ctrlKey: true })),
      ).toBe(true);
    });

    it("returns true for Escape without Ctrl", () => {
      expect(
        handler.handle(createEvent("keydown", { key: "Escape" })),
      ).toBe(true);
    });
  });
});
