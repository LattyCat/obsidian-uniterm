import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerminalSettingTab, SettingsTabPlugin } from "../settings-tab";
import { Setting, PluginSettingTab } from "obsidian";
import { DEFAULT_SETTINGS } from "../../constants";

describe("TerminalSettingTab", () => {
  let tab: TerminalSettingTab;
  let mockPlugin: SettingsTabPlugin;
  let mockApp: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApp = {};
    mockPlugin = {
      app: mockApp,
      settings: { ...DEFAULT_SETTINGS, consentGiven: true, customThemeColors: {}, screenReaderMode: false },
      updateSettings: vi.fn().mockResolvedValue(undefined),
    };

    tab = new TerminalSettingTab(mockApp, mockPlugin);
  });

  it("extends PluginSettingTab", () => {
    expect(tab).toBeInstanceOf(PluginSettingTab);
  });

  it("display() clears container first", () => {
    const emptySpy = vi.fn();
    (tab as any).containerEl.empty = emptySpy;
    tab.display();
    expect(emptySpy).toHaveBeenCalled();
  });

  it("display() creates Setting instances", () => {
    tab.display();
    const container = (tab as any).containerEl;
    // Should have created multiple settings (children added by Setting constructor)
    expect(container.children.length).toBeGreaterThan(0);
  });

  it("display() includes General heading", () => {
    // Setting constructor appends to container
    // We verify Setting was instantiated multiple times
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("General");
  });

  it("display() includes Appearance heading", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Appearance");
  });

  it("display() includes Advanced heading", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Advanced");
  });

  it("display() includes Default shell setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Default shell");
  });

  it("display() includes Font family setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Font family");
  });

  it("display() includes Font size setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Font size");
  });

  it("display() includes Cursor style setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Cursor style");
  });

  it("display() includes Theme setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Theme");
  });

  it("display() includes WebGL renderer setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("WebGL renderer");
  });

  it("display() includes Scrollback buffer setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Scrollback buffer");
  });

  it("display() includes Screen reader mode setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Screen reader mode");
  });

  it("display() includes Debug logging setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Debug logging");
  });

  it("display() includes Auto-show terminal setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Auto-show terminal");
  });

  it("display() includes Cursor blink setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Cursor blink");
  });

  it("display() includes Default working directory setting", () => {
    const settingSpy = vi.spyOn(Setting.prototype, "setName");
    tab.display();
    const names = settingSpy.mock.calls.map((c) => c[0]);
    expect(names).toContain("Default working directory");
  });

  it("creates correct number of settings (3 headings + 12 settings = 15)", () => {
    tab.display();
    const container = (tab as any).containerEl;
    expect(container.children.length).toBe(15);
  });
});
