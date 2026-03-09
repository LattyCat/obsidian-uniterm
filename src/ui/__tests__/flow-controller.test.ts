import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlowController } from "../flow-controller";

/**
 * Helper: creates a mock write function that captures callbacks
 * for manual invocation, simulating xterm's async onWriteParsed.
 */
function createMockWrite() {
  const calls: { data: string; callback?: () => void }[] = [];
  const writeFn = (data: string, callback?: () => void) => {
    calls.push({ data, callback });
  };
  return { writeFn, calls };
}

describe("FlowController", () => {
  let controller: FlowController;
  let mock: ReturnType<typeof createMockWrite>;

  beforeEach(() => {
    mock = createMockWrite();
    controller = new FlowController({ write: mock.writeFn });
  });

  describe("enqueue", () => {
    it("calls write immediately when queue is empty", () => {
      controller.enqueue("hello");

      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0].data).toBe("hello");
      expect(mock.calls[0].callback).toBeTypeOf("function");
    });

    it("buffers data when a write is in progress", () => {
      controller.enqueue("first");
      controller.enqueue("second");

      // Only the first chunk should have been written
      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0].data).toBe("first");
      expect(controller.bufferSize).toBe(1);
    });

    it("processes next chunk when callback is invoked", () => {
      controller.enqueue("first");
      controller.enqueue("second");

      // Invoke callback from first write
      mock.calls[0].callback!();

      expect(mock.calls).toHaveLength(2);
      expect(mock.calls[1].data).toBe("second");
    });

    it("processes multiple enqueued chunks in order", () => {
      controller.enqueue("a");
      controller.enqueue("b");
      controller.enqueue("c");

      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0].data).toBe("a");

      // Drain the queue by invoking callbacks
      mock.calls[0].callback!();
      expect(mock.calls).toHaveLength(2);
      expect(mock.calls[1].data).toBe("b");

      mock.calls[1].callback!();
      expect(mock.calls).toHaveLength(3);
      expect(mock.calls[2].data).toBe("c");

      // Final callback should leave writing = false, no more writes
      mock.calls[2].callback!();
      expect(mock.calls).toHaveLength(3);
      expect(controller.bufferSize).toBe(0);
    });

    it("allows new enqueues after queue is fully drained", () => {
      controller.enqueue("first");
      mock.calls[0].callback!();

      // Queue is now drained; enqueue again
      controller.enqueue("second");
      expect(mock.calls).toHaveLength(2);
      expect(mock.calls[1].data).toBe("second");
    });
  });

  describe("flush", () => {
    it("writes all buffered data immediately without callbacks", () => {
      controller.enqueue("a");
      controller.enqueue("b");
      controller.enqueue("c");

      // Only "a" has been written via processQueue
      expect(mock.calls).toHaveLength(1);

      controller.flush();

      // flush should have written "b" and "c" without callbacks
      expect(mock.calls).toHaveLength(3);
      expect(mock.calls[1].data).toBe("b");
      expect(mock.calls[1].callback).toBeUndefined();
      expect(mock.calls[2].data).toBe("c");
      expect(mock.calls[2].callback).toBeUndefined();
    });

    it("results in bufferSize of 0", () => {
      controller.enqueue("a");
      controller.enqueue("b");

      controller.flush();

      expect(controller.bufferSize).toBe(0);
    });

    it("is a no-op when queue is empty", () => {
      controller.flush();
      expect(mock.calls).toHaveLength(0);
      expect(controller.bufferSize).toBe(0);
    });

    it("allows normal enqueue processing after flush", () => {
      controller.enqueue("a");
      controller.enqueue("b");
      controller.flush();

      // After flush, writing should be reset; new enqueue writes immediately
      controller.enqueue("c");
      const lastCall = mock.calls[mock.calls.length - 1];
      expect(lastCall.data).toBe("c");
      expect(lastCall.callback).toBeTypeOf("function");
    });
  });

  describe("bufferSize", () => {
    it("is 0 initially", () => {
      expect(controller.bufferSize).toBe(0);
    });

    it("reflects the number of queued (not-yet-written) chunks", () => {
      controller.enqueue("a");
      // "a" is being written, queue is empty
      expect(controller.bufferSize).toBe(0);

      controller.enqueue("b");
      controller.enqueue("c");
      // "b" and "c" are queued
      expect(controller.bufferSize).toBe(2);
    });

    it("decreases as chunks are processed", () => {
      controller.enqueue("a");
      controller.enqueue("b");
      controller.enqueue("c");
      expect(controller.bufferSize).toBe(2);

      mock.calls[0].callback!();
      expect(controller.bufferSize).toBe(1);

      mock.calls[1].callback!();
      expect(controller.bufferSize).toBe(0);
    });
  });
});
