import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadNodePty,
  getPlatformInfo,
  _resetCache,
  _internals,
} from "../electron-bridge";

describe("electron-bridge", () => {
  describe("loadNodePty()", () => {
    beforeEach(() => {
      _resetCache();
      vi.restoreAllMocks();
    });

    it("returns the module on success", () => {
      const fakePty = { spawn: vi.fn() };
      vi.spyOn(_internals, "requireNodePty").mockReturnValue(fakePty);

      const result = loadNodePty();
      expect(result.pty).toBe(fakePty);
      expect(result.error).toBeNull();
    });

    it("caches the result (returns same instance on second call)", () => {
      const fakePty = { spawn: vi.fn() };
      vi.spyOn(_internals, "requireNodePty").mockReturnValue(fakePty);

      const first = loadNodePty();
      const second = loadNodePty();
      expect(first.pty).toBe(second.pty);
      expect(_internals.requireNodePty).toHaveBeenCalledTimes(1);
    });

    it("returns null + error message when require fails", () => {
      vi.spyOn(_internals, "requireNodePty").mockImplementation(() => {
        throw new Error("Cannot find module 'node-pty'");
      });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = loadNodePty();

      expect(result.pty).toBeNull();
      expect(result.error).toBe(
        "Failed to load node-pty: Cannot find module 'node-pty'"
      );
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getPlatformInfo()", () => {
    it("returns correct platform and arch", () => {
      const info = getPlatformInfo();
      expect(info.platform).toBe(process.platform);
      expect(info.arch).toBe(process.arch);
    });
  });
});
