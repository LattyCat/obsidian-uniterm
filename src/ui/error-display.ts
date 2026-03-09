export interface PtyLoadErrorOptions {
  error: string;
  onRetry?: () => void;
}

export interface ShellErrorOptions {
  error: string;
  shellPath: string;
}

/** Show PTY load error with optional retry button */
export function showPtyLoadError(container: HTMLElement, options: PtyLoadErrorOptions): void {
  clearError(container);

  const errorEl = document.createElement("div");
  errorEl.className = "terminal-error";
  errorEl.setAttribute("role", "alert");

  const messageEl = document.createElement("p");
  messageEl.className = "terminal-error-message";
  messageEl.textContent = `Failed to load terminal: ${options.error}`;
  errorEl.appendChild(messageEl);

  if (options.onRetry) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "terminal-error-retry";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", options.onRetry);
    errorEl.appendChild(retryBtn);
  }

  container.appendChild(errorEl);
}

/** Show shell-specific error */
export function showShellError(container: HTMLElement, options: ShellErrorOptions): void {
  clearError(container);

  const errorEl = document.createElement("div");
  errorEl.className = "terminal-error";
  errorEl.setAttribute("role", "alert");

  const messageEl = document.createElement("p");
  messageEl.className = "terminal-error-message";
  messageEl.textContent = `Shell error (${options.shellPath}): ${options.error}`;
  errorEl.appendChild(messageEl);

  container.appendChild(errorEl);
}

/** Clear any error display from the container */
export function clearError(container: HTMLElement): void {
  const existing = container.querySelector(".terminal-error");
  if (existing) {
    existing.remove();
  }
}
