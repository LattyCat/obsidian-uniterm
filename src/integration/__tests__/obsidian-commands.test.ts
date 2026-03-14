import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCommands, CommandCallbacks } from "../obsidian-commands";

describe("registerCommands", () => {
  let mockPlugin: { addCommand: ReturnType<typeof vi.fn> };
  let callbacks: CommandCallbacks;

  beforeEach(() => {
    mockPlugin = { addCommand: vi.fn() };
    callbacks = {
      toggleTerminal: vi.fn(),
      focusTerminal: vi.fn(),
      unfocusTerminal: vi.fn(),
      clearTerminal: vi.fn(),
      findInTerminal: vi.fn(),
      newTab: vi.fn(),
      closeTab: vi.fn(),
      getActiveTerminalView: vi.fn(() => null),
    };
  });

  it("registers 7 commands", () => {
    registerCommands(mockPlugin, callbacks);
    expect(mockPlugin.addCommand).toHaveBeenCalledTimes(7);
  });

  it("registers toggle-terminal command", () => {
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "toggle-terminal"
    );
    expect(cmd).toBeDefined();
    expect(cmd![0].name).toBe("Toggle Terminal Panel");
  });

  it("toggle-terminal callback calls toggleTerminal", () => {
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "toggle-terminal"
    );
    cmd![0].callback();
    expect(callbacks.toggleTerminal).toHaveBeenCalled();
  });

  it("focus-terminal checkCallback returns false when no active view", () => {
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "focus-terminal"
    );
    expect(cmd![0].checkCallback(true)).toBe(false);
  });

  it("focus-terminal checkCallback returns true when view exists", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "focus-terminal"
    );
    expect(cmd![0].checkCallback(true)).toBe(true);
  });

  it("focus-terminal executes focusTerminal when not checking", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "focus-terminal"
    );
    cmd![0].checkCallback(false);
    expect(callbacks.focusTerminal).toHaveBeenCalled();
  });

  it("clear-terminal executes clearTerminal when not checking", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "clear-terminal"
    );
    cmd![0].checkCallback(false);
    expect(callbacks.clearTerminal).toHaveBeenCalled();
  });

  it("unfocus-terminal executes unfocusTerminal when not checking", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "unfocus-terminal"
    );
    cmd![0].checkCallback(false);
    expect(callbacks.unfocusTerminal).toHaveBeenCalled();
  });

  it("find-in-terminal executes findInTerminal when not checking", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "find-in-terminal"
    );
    cmd![0].checkCallback(false);
    expect(callbacks.findInTerminal).toHaveBeenCalled();
  });

  it("checkCallback does not execute when checking=true", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "clear-terminal"
    );
    cmd![0].checkCallback(true);
    expect(callbacks.clearTerminal).not.toHaveBeenCalled();
  });

  // New tab commands

  it("new-tab uses callback (always available)", () => {
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "new-tab"
    );
    expect(cmd).toBeDefined();
    expect(cmd![0].callback).toBeDefined();
    cmd![0].callback();
    expect(callbacks.newTab).toHaveBeenCalled();
  });

  it("close-tab executes closeTab when not checking", () => {
    (callbacks.getActiveTerminalView as any).mockReturnValue({});
    registerCommands(mockPlugin, callbacks);
    const cmd = mockPlugin.addCommand.mock.calls.find(
      (c: any) => c[0].id === "close-tab"
    );
    expect(cmd).toBeDefined();
    cmd![0].checkCallback(false);
    expect(callbacks.closeTab).toHaveBeenCalled();
  });

});
