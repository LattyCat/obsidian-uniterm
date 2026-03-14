import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("obsidian", () => ({
  SuggestModal: class MockSuggestModal {
    app: any;
    constructor(app: any) {
      this.app = app;
    }
    open() {}
    close() {}
    getSuggestions() {
      return [];
    }
    renderSuggestion() {}
    onChooseSuggestion() {}
  },
  MarkdownView: class MockMarkdownView {},
}));

import {
  formatAsCodeBlock,
  getCaptureText,
  insertIntoCurrentNote,
  createNewNote,
  copyToClipboard,
  showCaptureModal,
} from "../output-capture";

describe("formatAsCodeBlock", () => {
  it("wraps text in a bash code block", () => {
    const result = formatAsCodeBlock("echo hello");
    expect(result).toBe("```bash\necho hello\n```");
  });

  it("handles multiline text", () => {
    const result = formatAsCodeBlock("line1\nline2\nline3");
    expect(result).toBe("```bash\nline1\nline2\nline3\n```");
  });

  it("handles empty string", () => {
    const result = formatAsCodeBlock("");
    expect(result).toBe("```bash\n\n```");
  });
});

describe("getCaptureText", () => {
  it("returns selection when available", () => {
    const result = getCaptureText({
      getSelectedText: () => "selected text",
      getBufferText: () => "full buffer",
    });
    expect(result).toBe("selected text");
  });

  it("returns buffer when no selection", () => {
    const result = getCaptureText({
      getSelectedText: () => null,
      getBufferText: () => "full buffer",
    });
    expect(result).toBe("full buffer");
  });

  it("returns buffer when selection is empty string", () => {
    const result = getCaptureText({
      getSelectedText: () => "",
      getBufferText: () => "full buffer",
    });
    expect(result).toBe("full buffer");
  });
});

describe("insertIntoCurrentNote", () => {
  it("calls replaceSelection on active editor", async () => {
    const mockEditor = { replaceSelection: vi.fn() };
    const mockLeaf = {
      view: Object.assign(Object.create((await import("obsidian")).MarkdownView.prototype), {
        editor: mockEditor,
      }),
    };
    const mockApp = {
      workspace: {
        activeLeaf: mockLeaf,
      },
    };

    const result = await insertIntoCurrentNote(mockApp, "test text");
    expect(result).toBe(true);
    expect(mockEditor.replaceSelection).toHaveBeenCalledWith("test text");
  });

  it("returns false when no active markdown view", async () => {
    const mockApp = {
      workspace: {
        activeLeaf: {
          view: {},
        },
      },
    };

    const result = await insertIntoCurrentNote(mockApp, "test text");
    expect(result).toBe(false);
  });

  it("returns false when no active leaf", async () => {
    const mockApp = {
      workspace: {
        activeLeaf: null,
      },
    };

    const result = await insertIntoCurrentNote(mockApp, "test text");
    expect(result).toBe(false);
  });

  it("returns false on error", async () => {
    const mockLeaf = {
      view: Object.assign(Object.create((await import("obsidian")).MarkdownView.prototype), {
        editor: {
          replaceSelection: () => {
            throw new Error("fail");
          },
        },
      }),
    };
    const mockApp = {
      workspace: { activeLeaf: mockLeaf },
    };

    const result = await insertIntoCurrentNote(mockApp, "test");
    expect(result).toBe(false);
  });
});

describe("createNewNote", () => {
  it("creates file with correct content", async () => {
    const mockApp = {
      vault: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await createNewNote(mockApp, "captured output");
    expect(result).toBe(true);
    expect(mockApp.vault.create).toHaveBeenCalledTimes(1);

    const [path, content] = mockApp.vault.create.mock.calls[0];
    expect(path).toMatch(/^Terminal Output.*\.md$/);
    expect(content).toBe("captured output");
  });

  it("returns false on error", async () => {
    const mockApp = {
      vault: {
        create: vi.fn().mockRejectedValue(new Error("fail")),
      },
    };

    const result = await createNewNote(mockApp, "text");
    expect(result).toBe(false);
  });
});

describe("copyToClipboard", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("calls navigator.clipboard.writeText", async () => {
    const result = await copyToClipboard("clipboard text");
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("clipboard text");
  });

  it("returns false on error", async () => {
    (navigator.clipboard.writeText as any).mockRejectedValue(new Error("fail"));

    const result = await copyToClipboard("text");
    expect(result).toBe(false);
  });
});

describe("showCaptureModal", () => {
  it("creates and opens a modal", () => {
    const mockApp = { workspace: {} };
    const options = {
      app: mockApp,
      getSelectedText: () => null,
      getBufferText: () => "buffer",
    };

    // Should not throw
    expect(() => showCaptureModal(options)).not.toThrow();
  });
});
