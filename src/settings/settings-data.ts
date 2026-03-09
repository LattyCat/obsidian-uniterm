import type { TerminalSettings } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

export interface PluginDataAdapter {
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
}

/** Load settings from plugin data, merging with defaults for missing fields */
export async function loadSettings(plugin: PluginDataAdapter): Promise<TerminalSettings> {
  const data = await plugin.loadData();
  if (!data) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...data };
}

/** Save settings to plugin data */
export async function saveSettings(
  plugin: PluginDataAdapter,
  settings: TerminalSettings,
): Promise<void> {
  await plugin.saveData(settings);
}
