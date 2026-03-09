// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FocusManager } from "../focus-manager";

describe("FocusManager", () => {
  let bodyClassList: DOMTokenList;
  let restoreFocus: ReturnType<typeof vi.fn>;
  let manager: FocusManager;

  beforeEach(() => {
    document.body.className = "";
    bodyClassList = document.body.classList;
    restoreFocus = vi.fn();
    manager = new FocusManager({ bodyClassList, restoreFocus });
  });

  it("initial state: isFocused is false", () => {
    expect(manager.isFocused).toBe(false);
  });

  it("focus() adds 'terminal-focused' class and sets isFocused true", () => {
    manager.focus();

    expect(manager.isFocused).toBe(true);
    expect(bodyClassList.contains("terminal-focused")).toBe(true);
  });

  it("focus() when already focused is a no-op", () => {
    manager.focus();
    const addSpy = vi.spyOn(bodyClassList, "add");

    manager.focus();

    expect(addSpy).not.toHaveBeenCalled();
    expect(manager.isFocused).toBe(true);
  });

  it("unfocus() removes class, calls restoreFocus, sets isFocused false", () => {
    manager.focus();

    manager.unfocus();

    expect(manager.isFocused).toBe(false);
    expect(bodyClassList.contains("terminal-focused")).toBe(false);
    expect(restoreFocus).toHaveBeenCalledOnce();
  });

  it("unfocus() when not focused is a no-op", () => {
    const removeSpy = vi.spyOn(bodyClassList, "remove");

    manager.unfocus();

    expect(removeSpy).not.toHaveBeenCalled();
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(manager.isFocused).toBe(false);
  });

  it("dispose() calls unfocus if focused", () => {
    manager.focus();

    manager.dispose();

    expect(manager.isFocused).toBe(false);
    expect(bodyClassList.contains("terminal-focused")).toBe(false);
    expect(restoreFocus).toHaveBeenCalledOnce();
  });

  it("dispose() does nothing if not focused", () => {
    const removeSpy = vi.spyOn(bodyClassList, "remove");

    manager.dispose();

    expect(removeSpy).not.toHaveBeenCalled();
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(manager.isFocused).toBe(false);
  });
});
