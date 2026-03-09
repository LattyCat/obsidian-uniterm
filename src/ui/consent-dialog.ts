import { Modal } from "obsidian";

export interface ConsentDialogCallbacks {
  onConsent: () => void;
  onDecline: () => void;
}

export class ConsentModal extends Modal {
  private callbacks: ConsentDialogCallbacks;

  constructor(app: any, callbacks: ConsentDialogCallbacks) {
    super(app);
    this.callbacks = callbacks;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Terminal Plugin - Security Notice" });

    contentEl.createEl("p", {
      text: "This plugin executes shell commands with full system access. Only enable this if you understand the security implications.",
    });

    contentEl.createEl("p", {
      text: "Malicious commands could damage your system or compromise your data.",
    });

    const buttonContainer = contentEl.createEl("div", { cls: "terminal-consent-buttons" });

    const consentBtn = buttonContainer.createEl("button", {
      text: "I understand, enable terminal",
      cls: "mod-cta",
    });
    consentBtn.addEventListener("click", () => {
      this.callbacks.onConsent();
      this.close();
    });

    const cancelBtn = buttonContainer.createEl("button", {
      text: "Cancel",
    });
    cancelBtn.addEventListener("click", () => {
      this.callbacks.onDecline();
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
