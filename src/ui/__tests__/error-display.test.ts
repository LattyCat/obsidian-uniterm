// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { showPtyLoadError, showShellError, clearError } from "../error-display";

describe("error-display", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  describe("showPtyLoadError", () => {
    it("creates error div with role='alert'", () => {
      showPtyLoadError(container, { error: "test error" });
      const errorEl = container.querySelector(".terminal-error");
      expect(errorEl).not.toBeNull();
      expect(errorEl!.getAttribute("role")).toBe("alert");
    });

    it("displays error message with prefix text", () => {
      showPtyLoadError(container, { error: "module not found" });
      const messageEl = container.querySelector(".terminal-error-message");
      expect(messageEl).not.toBeNull();
      expect(messageEl!.textContent).toBe("Failed to load terminal: module not found");
    });

    it("creates retry button when onRetry provided", () => {
      const onRetry = vi.fn();
      showPtyLoadError(container, { error: "fail", onRetry });
      const retryBtn = container.querySelector(".terminal-error-retry");
      expect(retryBtn).not.toBeNull();
      expect(retryBtn!.textContent).toBe("Retry");
    });

    it("does not create retry button when onRetry not provided", () => {
      showPtyLoadError(container, { error: "fail" });
      const retryBtn = container.querySelector(".terminal-error-retry");
      expect(retryBtn).toBeNull();
    });

    it("retry button click calls onRetry callback", () => {
      const onRetry = vi.fn();
      showPtyLoadError(container, { error: "fail", onRetry });
      const retryBtn = container.querySelector(".terminal-error-retry") as HTMLButtonElement;
      retryBtn.click();
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("clears previous errors before showing new one", () => {
      showPtyLoadError(container, { error: "first error" });
      showPtyLoadError(container, { error: "second error" });
      const errors = container.querySelectorAll(".terminal-error");
      expect(errors.length).toBe(1);
      const message = container.querySelector(".terminal-error-message");
      expect(message!.textContent).toBe("Failed to load terminal: second error");
    });
  });

  describe("showShellError", () => {
    it("creates error div with role='alert'", () => {
      showShellError(container, { error: "not found", shellPath: "/bin/zsh" });
      const errorEl = container.querySelector(".terminal-error");
      expect(errorEl).not.toBeNull();
      expect(errorEl!.getAttribute("role")).toBe("alert");
    });

    it("displays shell path and error message", () => {
      showShellError(container, { error: "permission denied", shellPath: "/bin/bash" });
      const messageEl = container.querySelector(".terminal-error-message");
      expect(messageEl!.textContent).toBe("Shell error (/bin/bash): permission denied");
    });
  });

  describe("clearError", () => {
    it("removes error element from container", () => {
      showPtyLoadError(container, { error: "test" });
      expect(container.querySelector(".terminal-error")).not.toBeNull();
      clearError(container);
      expect(container.querySelector(".terminal-error")).toBeNull();
    });

    it("is no-op when no error exists", () => {
      expect(() => clearError(container)).not.toThrow();
      expect(container.children.length).toBe(0);
    });
  });
});
