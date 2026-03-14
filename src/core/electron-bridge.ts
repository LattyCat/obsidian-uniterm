import type { ElectronBridgeResult, IPtyModule } from "../types";
import { LOG_PREFIX } from "../constants";

let cachedResult: ElectronBridgeResult | null = null;

/** @internal Indirection object for testability */
export const _internals = {
  requireNodePty(pluginDir?: string): unknown {
    // Use globalThis.require to bypass esbuild's static analysis
    const nodeRequire: NodeRequire =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).require || require;

    if (pluginDir) {
      const sep = process.platform === "win32" ? "\\" : "/";
      const modulePath = pluginDir + sep + "node_modules" + sep + "node-pty";
      // Absolute path required in Obsidian's Electron environment
      return nodeRequire(modulePath);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return nodeRequire("node-pty");
  },
};

/**
 * Dynamically loads node-pty via require().
 * Caches the result so subsequent calls return the same instance.
 * @param pluginDir - Absolute path to the plugin directory (for Obsidian environments)
 */
export function loadNodePty(pluginDir?: string): ElectronBridgeResult {
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    const pty = _internals.requireNodePty(pluginDir) as IPtyModule;
    cachedResult = { pty, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    cachedResult = { pty: null, error: `Failed to load node-pty: ${message}` };
    console.error(`${LOG_PREFIX} ${cachedResult.error}`);
  }

  return cachedResult;
}

/**
 * Resets the cached state. For testing only.
 * @internal
 */
export function _resetCache(): void {
  cachedResult = null;
}

/**
 * Returns current platform and architecture info.
 */
export function getPlatformInfo(): { platform: string; arch: string } {
  return {
    platform: process.platform,
    arch: process.arch,
  };
}
