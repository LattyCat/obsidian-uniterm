import type { PtySpawnOptions, SessionInfo } from "../types";
import { SessionState } from "../types";
import { PtyManager, PtyProcess } from "./pty-manager";

interface Session {
  info: SessionInfo;
  ptyProcess: PtyProcess;
}

/** Manages terminal sessions */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private nextId = 1;

  /** Create a new terminal session */
  create(
    ptyManager: PtyManager,
    options: PtySpawnOptions,
  ): SessionInfo | null {
    const id = this.generateId();
    const ptyProcess = ptyManager.spawn(options);

    if (!ptyProcess) return null;

    const info: SessionInfo = {
      id,
      state: SessionState.Running,
    };

    const session: Session = { info, ptyProcess };
    this.sessions.set(id, session);

    // Update state to Destroyed when PTY exits
    ptyProcess.onExit(() => {
      const s = this.sessions.get(id);
      if (s) {
        s.info.state = SessionState.Destroyed;
      }
    });

    return { ...info };
  }

  /** Get a session by ID */
  getSession(id: string): SessionInfo | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    return { ...session.info };
  }

  /** Get all sessions */
  getSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({ ...s.info }));
  }

  /** Get the PtyProcess for a session by ID */
  getPtyProcess(id: string): PtyProcess | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    return session.ptyProcess;
  }

  /** Destroy a session by ID */
  async destroy(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;

    session.info.state = SessionState.ShuttingDown;
    await session.ptyProcess.destroy();
    session.info.state = SessionState.Destroyed;
  }

  /** Destroy all active sessions */
  async destroyAll(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    await Promise.all(ids.map((id) => this.destroy(id)));
  }

  private generateId(): string {
    return `session-${this.nextId++}`;
  }
}
