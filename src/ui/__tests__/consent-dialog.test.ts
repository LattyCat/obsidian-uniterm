import { describe, it, expect, vi, beforeEach } from "vitest";
import { Modal } from "obsidian";
import { ConsentModal, ConsentDialogCallbacks } from "../consent-dialog";

describe("ConsentModal", () => {
  let app: any;
  let callbacks: ConsentDialogCallbacks;
  let modal: ConsentModal;

  beforeEach(() => {
    app = {};
    callbacks = {
      onConsent: vi.fn(),
      onDecline: vi.fn(),
    };
    modal = new ConsentModal(app, callbacks);
  });

  it("extends Modal", () => {
    expect(modal).toBeInstanceOf(Modal);
  });

  it("onOpen creates heading element", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const heading = contentEl.children.find((c: any) => c.tagName === "H2");
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe("Terminal Plugin - Security Notice");
  });

  it("onOpen creates security warning paragraphs", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const paragraphs = contentEl.children.filter((c: any) => c.tagName === "P");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toContain("shell commands with full system access");
    expect(paragraphs[1].textContent).toContain("Malicious commands");
  });

  it("onOpen creates consent button with correct text", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const buttonContainer = contentEl.children.find(
      (c: any) => c.classList && c.classList.contains("terminal-consent-buttons")
    );
    expect(buttonContainer).toBeDefined();
    const consentBtn = buttonContainer.children.find(
      (c: any) => c.textContent === "I understand, enable terminal"
    );
    expect(consentBtn).toBeDefined();
    expect(consentBtn.classList.contains("mod-cta")).toBe(true);
  });

  it("onOpen creates cancel button", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const buttonContainer = contentEl.children.find(
      (c: any) => c.classList && c.classList.contains("terminal-consent-buttons")
    );
    const cancelBtn = buttonContainer.children.find(
      (c: any) => c.textContent === "Cancel"
    );
    expect(cancelBtn).toBeDefined();
  });

  it("consent button click calls onConsent callback", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const buttonContainer = contentEl.children.find(
      (c: any) => c.classList && c.classList.contains("terminal-consent-buttons")
    );
    const consentBtn = buttonContainer.children.find(
      (c: any) => c.textContent === "I understand, enable terminal"
    );

    // Trigger click handler
    const clickHandlers = consentBtn._eventListeners["click"];
    expect(clickHandlers).toBeDefined();
    clickHandlers[0]();

    expect(callbacks.onConsent).toHaveBeenCalledOnce();
  });

  it("cancel button click calls onDecline callback", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    const buttonContainer = contentEl.children.find(
      (c: any) => c.classList && c.classList.contains("terminal-consent-buttons")
    );
    const cancelBtn = buttonContainer.children.find(
      (c: any) => c.textContent === "Cancel"
    );

    const clickHandlers = cancelBtn._eventListeners["click"];
    expect(clickHandlers).toBeDefined();
    clickHandlers[0]();

    expect(callbacks.onDecline).toHaveBeenCalledOnce();
  });

  it("onClose calls empty() on contentEl", () => {
    modal.onOpen();
    const contentEl = modal.contentEl as any;
    expect(contentEl.children.length).toBeGreaterThan(0);

    modal.onClose();
    expect(contentEl.children.length).toBe(0);
  });
});
