// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResizeHandle, ResizeHandleOptions } from "../resize-handle";

function createContainer(): HTMLElement {
  const leaf = document.createElement("div");
  leaf.className = "workspace-leaf";
  Object.defineProperty(leaf, "getBoundingClientRect", {
    value: () => ({ height: 300, width: 800, top: 500, left: 0, right: 800, bottom: 800 }),
  });

  const container = document.createElement("div");
  container.className = "terminal-panel";
  leaf.appendChild(container);
  document.body.appendChild(leaf);
  return container;
}

function createOptions(container: HTMLElement, overrides?: Partial<ResizeHandleOptions>): ResizeHandleOptions {
  return {
    container,
    initialHeight: 300,
    minHeight: 100,
    maxHeightRatio: 0.8,
    onResizeEnd: vi.fn(),
    ...overrides,
  };
}

describe("ResizeHandle", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = createContainer();
    // Mock window.innerHeight
    Object.defineProperty(window, "innerHeight", { value: 1000, writable: true });
  });

  afterEach(() => {
    container.closest(".workspace-leaf")?.remove();
  });

  it("should insert handle element as first child of container", () => {
    const handle = new ResizeHandle(createOptions(container));

    const handleEl = container.querySelector(".terminal-resize-handle");
    expect(handleEl).toBeTruthy();
    expect(container.firstChild).toBe(handleEl);

    handle.dispose();
  });

  it("should add dragging class on mousedown", () => {
    const handle = new ResizeHandle(createOptions(container));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));

    expect(handleEl.classList.contains("dragging")).toBe(true);

    // Clean up
    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 500 }));
    handle.dispose();
  });

  it("should update leaf height during drag", () => {
    const handle = new ResizeHandle(createOptions(container));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;
    const leaf = container.closest(".workspace-leaf") as HTMLElement;

    // Start drag
    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));

    // Move mouse up by 100px (should increase height)
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 400 }));

    expect(leaf.style.height).toBe("400px"); // 300 + 100
    expect(leaf.style.flexBasis).toBe("400px");
    expect(leaf.style.flexGrow).toBe("0");
    expect(leaf.style.flexShrink).toBe("0");

    // Clean up
    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 400 }));
    handle.dispose();
  });

  it("should clamp height to minHeight", () => {
    const handle = new ResizeHandle(createOptions(container, { minHeight: 100 }));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;
    const leaf = container.closest(".workspace-leaf") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));

    // Move mouse down by 300px (should try to decrease to 0, but clamped to 100)
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 800 }));

    expect(leaf.style.height).toBe("100px");

    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 800 }));
    handle.dispose();
  });

  it("should clamp height to maxHeightRatio * window.innerHeight", () => {
    const handle = new ResizeHandle(createOptions(container, { maxHeightRatio: 0.8 }));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;
    const leaf = container.closest(".workspace-leaf") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));

    // Move mouse up by 800px (should try 1100, clamped to 800)
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: -300 }));

    expect(leaf.style.height).toBe("800px"); // 1000 * 0.8

    document.dispatchEvent(new MouseEvent("mouseup", { clientY: -300 }));
    handle.dispose();
  });

  it("should call onResize on each mousemove during drag", () => {
    const onResize = vi.fn();
    const handle = new ResizeHandle(createOptions(container, { onResize }));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 450 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 400 }));

    expect(onResize).toHaveBeenCalledTimes(2);

    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 400 }));
    handle.dispose();
  });

  it("should call onResizeEnd with final height on mouseup", () => {
    const onResizeEnd = vi.fn();
    const handle = new ResizeHandle(createOptions(container, { onResizeEnd }));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 400 }));
    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 400 }));

    expect(onResizeEnd).toHaveBeenCalledOnce();
    // getBoundingClientRect returns mocked height of 300
    expect(onResizeEnd).toHaveBeenCalledWith(300);

    handle.dispose();
  });

  it("should remove dragging class on mouseup", () => {
    const handle = new ResizeHandle(createOptions(container));
    const handleEl = container.querySelector(".terminal-resize-handle") as HTMLElement;

    handleEl.dispatchEvent(new MouseEvent("mousedown", { clientY: 500, bubbles: true }));
    expect(handleEl.classList.contains("dragging")).toBe(true);

    document.dispatchEvent(new MouseEvent("mouseup", { clientY: 500 }));
    expect(handleEl.classList.contains("dragging")).toBe(false);

    handle.dispose();
  });

  it("should clean up on dispose", () => {
    const handle = new ResizeHandle(createOptions(container));

    const handleEl = container.querySelector(".terminal-resize-handle");
    expect(handleEl).toBeTruthy();

    handle.dispose();

    expect(container.querySelector(".terminal-resize-handle")).toBeNull();
  });

  it("should not update height when not dragging", () => {
    const handle = new ResizeHandle(createOptions(container));
    const leaf = container.closest(".workspace-leaf") as HTMLElement;

    // Send mousemove without mousedown
    document.dispatchEvent(new MouseEvent("mousemove", { clientY: 400 }));

    expect(leaf.style.height).toBe("");

    handle.dispose();
  });
});
