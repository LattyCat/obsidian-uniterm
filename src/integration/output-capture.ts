import { SuggestModal, MarkdownView } from "obsidian";

export interface OutputCaptureOptions {
  app: any;
  getSelectedText: () => string | null;
  getBufferText: () => string;
}

type CaptureMode = "insert" | "new-note" | "clipboard";

interface CaptureModeItem {
  mode: CaptureMode;
  label: string;
}

const CAPTURE_MODES: CaptureModeItem[] = [
  { mode: "insert", label: "Insert into current note" },
  { mode: "new-note", label: "Create new note" },
  { mode: "clipboard", label: "Copy to clipboard" },
];

/** Format text as a bash code block */
export function formatAsCodeBlock(text: string): string {
  return `\`\`\`bash\n${text}\n\`\`\``;
}

/** Get capture text - selection if available, otherwise full buffer */
export function getCaptureText(options: {
  getSelectedText: () => string | null;
  getBufferText: () => string;
}): string {
  const selected = options.getSelectedText();
  if (selected) return selected;
  return options.getBufferText();
}

/** Insert text into the active markdown note */
export async function insertIntoCurrentNote(app: any, text: string): Promise<boolean> {
  try {
    const leaf = app.workspace.activeLeaf;
    if (!leaf || !(leaf.view instanceof MarkdownView)) return false;
    leaf.view.editor.replaceSelection(text);
    return true;
  } catch {
    return false;
  }
}

/** Create a new note with the captured text */
export async function createNewNote(app: any, text: string): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `Terminal Output ${timestamp}.md`;
    await app.vault.create(filename, text);
    return true;
  } catch {
    return false;
  }
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

class CaptureModal extends SuggestModal<CaptureModeItem> {
  private options: OutputCaptureOptions;

  constructor(options: OutputCaptureOptions) {
    super(options.app);
    this.options = options;
  }

  getSuggestions(): CaptureModeItem[] {
    return CAPTURE_MODES;
  }

  renderSuggestion(item: CaptureModeItem, el: HTMLElement): void {
    el.createEl("div", { text: item.label });
  }

  async onChooseSuggestion(item: CaptureModeItem): Promise<void> {
    const raw = getCaptureText(this.options);
    const formatted = formatAsCodeBlock(raw);

    switch (item.mode) {
      case "insert":
        await insertIntoCurrentNote(this.options.app, formatted);
        break;
      case "new-note":
        await createNewNote(this.options.app, formatted);
        break;
      case "clipboard":
        await copyToClipboard(formatted);
        break;
    }
  }
}

/** Show the capture mode selection modal and execute */
export function showCaptureModal(options: OutputCaptureOptions): void {
  new CaptureModal(options).open();
}
