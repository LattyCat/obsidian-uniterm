import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectDefaultShell, getShellName } from "../shell-detector";

describe("shell-detector", () => {
  const originalShell = process.env.SHELL;

  afterEach(() => {
    // Restore original SHELL env
    if (originalShell !== undefined) {
      process.env.SHELL = originalShell;
    } else {
      delete process.env.SHELL;
    }
  });

  describe("detectDefaultShell()", () => {
    it("returns 'powershell.exe' on Windows (win32)", () => {
      const result = detectDefaultShell("win32");
      expect(result).toBe("powershell.exe");
    });

    it("returns process.env.SHELL on macOS (darwin)", () => {
      process.env.SHELL = "/bin/zsh";
      const result = detectDefaultShell("darwin");
      expect(result).toBe("/bin/zsh");
    });

    it("returns process.env.SHELL on Linux", () => {
      process.env.SHELL = "/bin/bash";
      const result = detectDefaultShell("linux");
      expect(result).toBe("/bin/bash");
    });

    it("returns '/bin/bash' as fallback when $SHELL is not set", () => {
      delete process.env.SHELL;
      const result = detectDefaultShell("darwin");
      expect(result).toBe("/bin/bash");
    });
  });

  describe("getShellName()", () => {
    it("extracts basename from path (e.g., '/bin/zsh' -> 'zsh')", () => {
      expect(getShellName("/bin/zsh")).toBe("zsh");
      expect(getShellName("/bin/bash")).toBe("bash");
      expect(getShellName("/usr/local/bin/fish")).toBe("fish");
      expect(getShellName("powershell.exe")).toBe("powershell.exe");
    });
  });
});
