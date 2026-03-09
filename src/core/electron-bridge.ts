import type { ElectronBridgeResult } from "../types";
import { LOG_PREFIX } from "../constants";

let cachedResult: ElectronBridgeResult | null = null;

/** @internal Indirection object for testability */
export const _internals = {
  requireNodePty(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("node-pty");
  },
};

/**
 * Dynamically loads node-pty via require().
 * Caches the result so subsequent calls return the same instance.
 */
export function loadNodePty(): ElectronBridgeResult {
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    const pty = _internals.requireNodePty();
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
