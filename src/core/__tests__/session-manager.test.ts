import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionManager } from "../session-manager";
import { SessionState } from "../../types";
import type { ShellProfile, PtySpawnOptions } from "../../types";
import type { PtyManager, PtyProcess } from "../pty-manager";

function createMockPtyProcess(): PtyProcess & {
  _emitExit: (code: number, signal?: number) => void;
} {
  const exitCallbacks: ((code: number, signal?: number) => void)[] = [];

  return {
    onData: vi.fn(),
    onExit: vi.fn((cb: (code: number, signal?: number) => void) => {
      exitCallbacks.push(cb);
    }),
    resize: vi.fn(),
    write: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    hasExited: false,
    _emitExit(code: number, signal?: number) {
      for (const cb of exitCallbacks) cb(code, signal);
    },
  } as any;
}

function createMockPtyManager(
  mockProcess: ReturnType<typeof createMockPtyProcess>
): PtyManager {
  return {
    spawn: vi.fn().mockReturnValue(mockProcess),
  } as any;
}

function createDefaultProfile(
  overrides: Partial<ShellProfile> = {}
): ShellProfile {
  return {
    id: "bash",
    name: "Bash",
    shellPath: "/bin/bash",
    shellArgs: ["--login"],
    cwd: "/home/user",
    icon: "terminal",
    ...overrides,
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

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockPtyProcess: ReturnType<typeof createMockPtyProcess>;
  let mockPtyManager: PtyManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
    mockPtyProcess = createMockPtyProcess();
    mockPtyManager = createMockPtyManager(mockPtyProcess);
  });

  describe("create()", () => {
    it("creates a session with SessionState.Running", () => {
      const info = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      expect(info.state).toBe(SessionState.Running);
    });

    it("assigns unique session IDs", () => {
      const info1 = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );
      const info2 = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      expect(info1.id).not.toBe(info2.id);
    });
  });

  describe("getSession()", () => {
    it("returns the session by ID", () => {
      const created = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      const retrieved = sessionManager.getSession(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.state).toBe(SessionState.Running);
      expect(retrieved!.profile.name).toBe("Bash");
    });

    it("returns null for non-existent session", () => {
      expect(sessionManager.getSession("non-existent")).toBeNull();
    });
  });

  describe("getSessions()", () => {
    it("returns all sessions", () => {
      sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );
      sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile({ id: "zsh", name: "Zsh" })
      );

      const sessions = sessionManager.getSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe("destroy()", () => {
    it("transitions state: Running -> ShuttingDown -> Destroyed", async () => {
      const info = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      // Capture state during destroy by checking inside the mock
      const states: string[] = [];
      (mockPtyProcess.destroy as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          const session = sessionManager.getSession(info.id);
          if (session) states.push(session.state);
        }
      );

      await sessionManager.destroy(info.id);

      expect(states).toContain(SessionState.ShuttingDown);

      const afterDestroy = sessionManager.getSession(info.id);
      expect(afterDestroy!.state).toBe(SessionState.Destroyed);
    });

    it("calls ptyProcess.destroy()", async () => {
      const info = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      await sessionManager.destroy(info.id);
      expect(mockPtyProcess.destroy).toHaveBeenCalled();
    });

    it("is a no-op for non-existent session", async () => {
      // Should not throw
      await sessionManager.destroy("non-existent");
    });
  });

  describe("destroyAll()", () => {
    it("destroys all active sessions", async () => {
      const mockProcess1 = createMockPtyProcess();
      const mockProcess2 = createMockPtyProcess();
      const manager1 = createMockPtyManager(mockProcess1);
      const manager2 = createMockPtyManager(mockProcess2);

      sessionManager.create(
        manager1,
        createDefaultOptions(),
        createDefaultProfile()
      );
      sessionManager.create(
        manager2,
        createDefaultOptions(),
        createDefaultProfile()
      );

      await sessionManager.destroyAll();

      const sessions = sessionManager.getSessions();
      expect(
        sessions.every((s) => s.state === SessionState.Destroyed)
      ).toBe(true);
    });
  });

  describe("onExit callback", () => {
    it("updates session state to Destroyed when PTY exits", () => {
      const info = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      // Simulate the PTY process exiting
      mockPtyProcess._emitExit(0);

      const session = sessionManager.getSession(info.id);
      expect(session!.state).toBe(SessionState.Destroyed);
    });
  });

  describe("session state transitions", () => {
    it("follows correct lifecycle: Running -> ShuttingDown -> Destroyed", async () => {
      const info = sessionManager.create(
        mockPtyManager,
        createDefaultOptions(),
        createDefaultProfile()
      );

      expect(sessionManager.getSession(info.id)!.state).toBe(
        SessionState.Running
      );

      const statesDuringDestroy: string[] = [];
      (mockPtyProcess.destroy as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          statesDuringDestroy.push(
            sessionManager.getSession(info.id)!.state
          );
        }
      );

      await sessionManager.destroy(info.id);

      expect(statesDuringDestroy).toEqual([SessionState.ShuttingDown]);
      expect(sessionManager.getSession(info.id)!.state).toBe(
        SessionState.Destroyed
      );
    });
  });
});
