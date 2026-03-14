// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapePosixPath,
  escapePowerShellPath,
  escapeCmdPath,
  escapePathForShell,
  resolveVaultPath,
  extractPathFromObsidianUri,
  DragDropHandler,
  ShellType,
  DragDropHandlerOptions,
} from "../drag-drop-handler";

describe("escapePosixPath", () => {
  it("wraps a basic path in single quotes", () => {
    expect(escapePosixPath("/home/user/file.txt")).toBe("'/home/user/file.txt'");
  });

  it("wraps a path with spaces in single quotes", () => {
    expect(escapePosixPath("/home/user/my file.txt")).toBe(
      "'/home/user/my file.txt'"
    );
  });

  it("escapes single quotes within the path", () => {
    expect(escapePosixPath("/home/user/it's a file.txt")).toBe(
      "'/home/user/it'\\''s a file.txt'"
    );
  });
});

describe("escapePowerShellPath", () => {
  it("wraps a basic path in double quotes", () => {
    expect(escapePowerShellPath("C:\\Users\\file.txt")).toBe(
      '"C:\\Users\\file.txt"'
    );
  });

  it("escapes double quotes within the path", () => {
    expect(escapePowerShellPath('C:\\Users\\"special" file.txt')).toBe(
      '"C:\\Users\\`"special`" file.txt"'
    );
  });
});

describe("escapeCmdPath", () => {
  it("wraps a basic path in double quotes", () => {
    expect(escapeCmdPath("C:\\Users\\file.txt")).toBe('"C:\\Users\\file.txt"');
  });
});

describe("escapePathForShell", () => {
  it("delegates to escapePosixPath for posix shell", () => {
    expect(escapePathForShell("/home/user/file.txt", "posix")).toBe(
      "'/home/user/file.txt'"
    );
  });

  it("delegates to escapePowerShellPath for powershell", () => {
    expect(escapePathForShell("C:\\Users\\file.txt", "powershell")).toBe(
      '"C:\\Users\\file.txt"'
    );
  });

  it("delegates to escapeCmdPath for cmd", () => {
    expect(escapePathForShell("C:\\Users\\file.txt", "cmd")).toBe(
      '"C:\\Users\\file.txt"'
    );
  });
});

describe("resolveVaultPath", () => {
  it("joins vault path and relative path", () => {
    expect(resolveVaultPath("notes/file.md", "/home/user/vault")).toBe(
      "/home/user/vault/notes/file.md"
    );
  });

  it("handles trailing slash on vault path", () => {
    expect(resolveVaultPath("notes/file.md", "/home/user/vault/")).toBe(
      "/home/user/vault/notes/file.md"
    );
  });
});

describe("extractPathFromObsidianUri", () => {
  it("extracts file path from obsidian:// URI", () => {
    expect(
      extractPathFromObsidianUri("obsidian://open?vault=obsidian&file=2026-03-11T07-46-22")
    ).toBe("2026-03-11T07-46-22");
  });

  it("handles URL-encoded characters", () => {
    expect(
      extractPathFromObsidianUri("obsidian://open?vault=test&file=notes%2Fmy%20file")
    ).toBe("notes/my file");
  });

  it("returns null for non-obsidian URIs", () => {
    expect(extractPathFromObsidianUri("https://example.com")).toBeNull();
  });

  it("returns null for plain file paths", () => {
    expect(extractPathFromObsidianUri("notes/file.md")).toBeNull();
  });

  it("returns null when file parameter is missing", () => {
    expect(extractPathFromObsidianUri("obsidian://open?vault=test")).toBeNull();
  });
});

describe("DragDropHandler", () => {
  let container: HTMLDivElement;
  let writeToPty: ReturnType<typeof vi.fn>;
  let getShellType: ReturnType<typeof vi.fn>;
  let handler: DragDropHandler;

  beforeEach(() => {
    container = document.createElement("div");
    writeToPty = vi.fn();
    getShellType = vi.fn<() => ShellType>(() => "posix");
    handler = new DragDropHandler({
      container,
      vaultPath: "/home/user/vault",
      getShellType,
      writeToPty,
    });
  });

  afterEach(() => {
    handler.dispose();
  });

  it("adds terminal-drag-over class on dragover", () => {
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    container.dispatchEvent(event);
    expect(container.classList.contains("terminal-drag-over")).toBe(true);
  });

  it("prevents default on dragover", () => {
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    container.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("removes terminal-drag-over class on dragleave", () => {
    container.classList.add("terminal-drag-over");
    const event = new Event("dragleave", { bubbles: true });
    container.dispatchEvent(event);
    expect(container.classList.contains("terminal-drag-over")).toBe(false);
  });

  it("handles drop: resolves path, escapes for shell, writes to PTY with trailing space", () => {
    const dataTransfer = {
      getData: vi.fn(() => "notes/my file.md"),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(container.classList.contains("terminal-drag-over")).toBe(false);
    expect(dataTransfer.getData).toHaveBeenCalledWith("text/plain");
    expect(writeToPty).toHaveBeenCalledWith(
      "'/home/user/vault/notes/my file.md' "
    );
  });

  it("handles obsidian:// URI drop by extracting file path and adding .md", () => {
    const dataTransfer = {
      getData: vi.fn(() => "obsidian://open?vault=obsidian&file=2026-03-11T07-46-22"),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(writeToPty).toHaveBeenCalledWith(
      "'/home/user/vault/2026-03-11T07-46-22.md' "
    );
  });

  it("handles obsidian:// URI with subdirectory path", () => {
    const dataTransfer = {
      getData: vi.fn(() => "obsidian://open?vault=obsidian&file=notes%2Fmy%20note"),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(writeToPty).toHaveBeenCalledWith(
      "'/home/user/vault/notes/my note.md' "
    );
  });

  it("handles obsidian:// URI with existing extension (no .md added)", () => {
    const dataTransfer = {
      getData: vi.fn(() => "obsidian://open?vault=obsidian&file=assets%2Fimage.png"),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(writeToPty).toHaveBeenCalledWith(
      "'/home/user/vault/assets/image.png' "
    );
  });

  it("does not write to PTY when drop has no path data", () => {
    const dataTransfer = {
      getData: vi.fn(() => ""),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(writeToPty).not.toHaveBeenCalled();
  });

  it("uses the current shell type from getShellType", () => {
    getShellType.mockReturnValue("powershell");
    const dataTransfer = {
      getData: vi.fn(() => "notes/file.md"),
    };
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    container.dispatchEvent(event);

    expect(writeToPty).toHaveBeenCalledWith(
      '"/home/user/vault/notes/file.md" '
    );
  });

  it("dispose removes event listeners", () => {
    handler.dispose();

    const event = new Event("dragover", { bubbles: true, cancelable: true });
    container.dispatchEvent(event);
    expect(container.classList.contains("terminal-drag-over")).toBe(false);

    const dataTransfer = { getData: vi.fn(() => "notes/file.md") };
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", { value: dataTransfer });
    container.dispatchEvent(dropEvent);
    expect(writeToPty).not.toHaveBeenCalled();
  });
});
