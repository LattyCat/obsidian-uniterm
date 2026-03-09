/**
 * Backpressure-aware write buffering for xterm.js.
 *
 * Enqueued data is written one chunk at a time. The next chunk is only
 * written after the previous write's callback fires (matching xterm's
 * onWriteParsed pattern). Call flush() to drain the buffer synchronously.
 */
export class FlowController {
  private queue: string[] = [];
  private writing = false;
  private writeFn: (data: string, callback?: () => void) => void;

  constructor(options: { write: (data: string, callback?: () => void) => void }) {
    this.writeFn = options.write;
  }

  enqueue(data: string): void {
    this.queue.push(data);
    if (!this.writing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0) {
      this.writing = false;
      return;
    }
    this.writing = true;
    const chunk = this.queue.shift()!;
    this.writeFn(chunk, () => {
      this.processQueue();
    });
  }

  flush(): void {
    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      this.writeFn(chunk);
    }
    this.writing = false;
  }

  get bufferSize(): number {
    return this.queue.length;
  }
}
