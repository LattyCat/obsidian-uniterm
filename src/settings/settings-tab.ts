import { PluginSettingTab, Setting } from "obsidian";
import type { TerminalSettings } from "../types";

export interface SettingsTabPlugin {
  app: any;
  settings: TerminalSettings;
  updateSettings(updates: Partial<TerminalSettings>): Promise<void>;
}

export class TerminalSettingTab extends PluginSettingTab {
  private settingsPlugin: SettingsTabPlugin;

  constructor(app: any, plugin: SettingsTabPlugin) {
    super(app, plugin);
    this.settingsPlugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // General section
    new Setting(containerEl).setName("General").setHeading();

    new Setting(containerEl)
      .setName("Default shell")
      .setDesc("Path to the shell executable. Leave empty for auto-detection.")
      .addText((text) =>
        text
          .setPlaceholder("Auto-detect")
          .setValue(this.settingsPlugin.settings.defaultShell)
          .onChange(async (value: string) => {
            await this.settingsPlugin.updateSettings({ defaultShell: value });
          })
      );

    new Setting(containerEl)
      .setName("Default working directory")
      .setDesc("Starting directory for new terminals. Leave empty for vault root.")
      .addText((text) =>
        text
          .setPlaceholder("Vault root")
          .setValue(this.settingsPlugin.settings.defaultCwd)
          .onChange(async (value: string) => {
            await this.settingsPlugin.updateSettings({ defaultCwd: value });
          })
      );

    new Setting(containerEl)
      .setName("Auto-show terminal")
      .setDesc("Automatically show terminal panel on plugin load.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsPlugin.settings.autoShow)
          .onChange(async (value: boolean) => {
            await this.settingsPlugin.updateSettings({ autoShow: value });
          })
      );

    // Appearance section
    new Setting(containerEl).setName("Appearance").setHeading();

    new Setting(containerEl)
      .setName("Font family")
      .setDesc("Terminal font family.")
      .addText((text) =>
        text
          .setValue(this.settingsPlugin.settings.fontFamily)
          .onChange(async (value: string) => {
            await this.settingsPlugin.updateSettings({ fontFamily: value });
          })
      );

    new Setting(containerEl)
      .setName("Font size")
      .setDesc("Terminal font size in pixels.")
      .addSlider((slider) =>
        slider
          .setLimits(8, 32, 1)
          .setValue(this.settingsPlugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange(async (value: number) => {
            await this.settingsPlugin.updateSettings({ fontSize: value });
          })
      );

    new Setting(containerEl)
      .setName("Cursor style")
      .setDesc("Terminal cursor appearance.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("block", "Block")
          .addOption("underline", "Underline")
          .addOption("bar", "Bar")
          .setValue(this.settingsPlugin.settings.cursorStyle)
          .onChange(async (value: string) => {
            await this.settingsPlugin.updateSettings({
              cursorStyle: value as "block" | "underline" | "bar",
            });
          })
      );

    new Setting(containerEl)
      .setName("Cursor blink")
      .setDesc("Enable cursor blinking.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsPlugin.settings.cursorBlink)
          .onChange(async (value: boolean) => {
            await this.settingsPlugin.updateSettings({ cursorBlink: value });
          })
      );

    new Setting(containerEl)
      .setName("Theme")
      .setDesc("Terminal color theme.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("obsidian", "Obsidian (sync with app)")
          .addOption("dark", "Dark")
          .addOption("light", "Light")
          .addOption("custom", "Custom")
          .setValue(this.settingsPlugin.settings.theme)
          .onChange(async (value: string) => {
            await this.settingsPlugin.updateSettings({
              theme: value as "obsidian" | "dark" | "light" | "custom",
            });
          })
      );

    new Setting(containerEl)
      .setName("WebGL renderer")
      .setDesc("Use GPU-accelerated rendering. Disable if you experience visual glitches.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsPlugin.settings.webglRenderer)
          .onChange(async (value: boolean) => {
            await this.settingsPlugin.updateSettings({ webglRenderer: value });
          })
      );

    // Advanced section
    new Setting(containerEl).setName("Advanced").setHeading();

    new Setting(containerEl)
      .setName("Scrollback buffer")
      .setDesc("Maximum number of lines kept in terminal history.")
      .addSlider((slider) =>
        slider
          .setLimits(1000, 100000, 1000)
          .setValue(this.settingsPlugin.settings.scrollbackBuffer)
          .setDynamicTooltip()
          .onChange(async (value: number) => {
            await this.settingsPlugin.updateSettings({ scrollbackBuffer: value });
          })
      );

    new Setting(containerEl)
      .setName("Screen reader mode")
      .setDesc("Enable accessibility features for screen readers.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsPlugin.settings.screenReaderMode)
          .onChange(async (value: boolean) => {
            await this.settingsPlugin.updateSettings({ screenReaderMode: value });
          })
      );

    new Setting(containerEl)
      .setName("Debug logging")
      .setDesc("Enable verbose logging for troubleshooting.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsPlugin.settings.debugLog)
          .onChange(async (value: boolean) => {
            await this.settingsPlugin.updateSettings({ debugLog: value });
          })
      );
  }
}
