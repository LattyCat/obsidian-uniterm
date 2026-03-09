import { describe, it, expect, vi, beforeEach } from "vitest";
import { PtyManager } from "../pty-manager";
import type { PtySpawnOptions } from "../../types";
import { SHUTDOWN_TIMEOUT_MS } from "../../constants";

function createMockPtyInstance() {
  const dataCallbacks: ((data: string) => void)[] = [];
  const exitCallbacks: ((info: { exitCode: number; signal?: number }) => void)[] = [];

  return {
    onData: vi.fn((cb: (data: string) => void) => {
      dataCallbacks.push(cb);
      return { dispose: vi.fn() };
    }),
    onExit: vi.fn(
      (cb: (info: { exitCode: number; signal?: number }) => void) => {
        exitCallbacks.push(cb);
        return { dispose: vi.fn() };
      }
    ),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    // Helpers for triggering events in tests
    _emitData(data: string) {
      for (const cb of dataCallbacks) cb(data);
    },
    _emitExit(exitCode: number, signal?: number) {
      for (const cb of exitCallbacks) cb({ exitCode, signal });
    },
  };
}

function createDefaultOptions(
  overrides: Partial<PtySpawnOptions> = {}
): PtySpawnOptions {
  return {
    shell: "/bin/bash",
    args: ["--login"],
    cwd: "/home/user",
    cols: 80,
    rows: 24,
    env: {},
    ...overrides,
  };
}

describe("PtyManager", () => {
  let mockPtyModule: { spawn: ReturnType<typeof vi.fn> };
  let mockPtyInstance: ReturnType<typeof createMockPtyInstance>;
  let ptyManager: PtyManager;

  beforeEach(() => {
    mockPtyInstance = createMockPtyInstance();
    mockPtyModule = {
      spawn: vi.fn().mockReturnValue(mockPtyInstance),
    };
    ptyManager = new PtyManager(mockPtyModule);
  });

  describe("spawn()", () => {
    it("calls node-pty spawn with correct options", () => {
      const options = createDefaultOptions();
      ptyManager.spawn(options);

      expect(mockPtyModule.spawn).toHaveBeenCalledWith(
        "/bin/bash",
        ["--login"],
        expect.objectContaining({
          cwd: "/home/user",
          cols: 80,
          rows: 24,
        })
      );
    });

    it("sets TERM=xterm-256color and COLORTERM=truecolor in env", () => {
      const options = createDefaultOptions();
      ptyManager.spawn(options);

      const spawnCall = mockPtyModule.spawn.mock.calls[0];
      const passedEnv = spawnCall[2].env;
      expect(passedEnv.TERM).toBe("xterm-256color");
      expect(passedEnv.COLORTERM).toBe("truecolor");
    });

    it("merges process.env with custom env", () => {
      const options = createDefaultOptions({
        env: { MY_CUSTOM_VAR: "hello" },
      });
      ptyManager.spawn(options);

      const spawnCall = mockPtyModule.spawn.mock.calls[0];
      const passedEnv = spawnCall[2].env;
      expect(passedEnv.MY_CUSTOM_VAR).toBe("hello");
      // process.env should be merged in, with default paths appended
      expect(passedEnv.PATH).toContain(process.env.PATH!);
      expect(passedEnv.PATH).toContain("/usr/local/bin");
    });
  });

  describe("PtyProcess.resize()", () => {
    it("calls pty.resize(cols, rows)", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      proc.resize(120, 40);
      expect(mockPtyInstance.resize).toHaveBeenCalledWith(120, 40);
    });
  });

  describe("PtyProcess.write()", () => {
    it("calls pty.write(data)", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      proc.write("ls -la\n");
      expect(mockPtyInstance.write).toHaveBeenCalledWith("ls -la\n");
    });
  });

  describe("PtyProcess.destroy()", () => {
    it("sends kill signal, waits timeout, then calls kill(SIGKILL) and dispose", async () => {
      vi.useFakeTimers();
      const proc = ptyManager.spawn(createDefaultOptions());

      const destroyPromise = proc.destroy();

      // Should have called kill() (SIGTERM)
      expect(mockPtyInstance.kill).toHaveBeenCalledTimes(1);
      expect(mockPtyInstance.kill).toHaveBeenCalledWith();

      // Advance past the shutdown timeout
      await vi.advanceTimersByTimeAsync(SHUTDOWN_TIMEOUT_MS);

      await destroyPromise;

      // Should have called kill('SIGKILL') after timeout
      expect(mockPtyInstance.kill).toHaveBeenCalledTimes(2);
      expect(mockPtyInstance.kill).toHaveBeenCalledWith("SIGKILL");

      vi.useRealTimers();
    });

    it("resolves immediately if process already exited", async () => {
      const proc = ptyManager.spawn(createDefaultOptions());

      // Simulate the process already having exited
      mockPtyInstance._emitExit(0);

      await proc.destroy();

      // kill() should not be called since process already exited
      expect(mockPtyInstance.kill).not.toHaveBeenCalled();
    });
  });

  describe("PtyProcess.onData()", () => {
    it("receives PTY output", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      const callback = vi.fn();
      proc.onData(callback);

      mockPtyInstance._emitData("hello world");
      expect(callback).toHaveBeenCalledWith("hello world");
    });

    it("returns a disposable object", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      const disposable = proc.onData(vi.fn());
      expect(disposable).toHaveProperty("dispose");
      expect(typeof disposable.dispose).toBe("function");
    });

    it("dispose removes the callback", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      const callback = vi.fn();
      const disposable = proc.onData(callback);
      disposable.dispose();
      mockPtyInstance._emitData("should not receive");
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("PtyProcess.onExit()", () => {
    it("receives exit code and signal", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      const callback = vi.fn();
      proc.onExit(callback);

      mockPtyInstance._emitExit(1, 15);
      expect(callback).toHaveBeenCalledWith(1, 15);
    });

    it("returns a disposable object from onExit", () => {
      const proc = ptyManager.spawn(createDefaultOptions());
      const disposable = proc.onExit(vi.fn());
      expect(disposable).toHaveProperty("dispose");
      expect(typeof disposable.dispose).toBe("function");
    });
  });
});
