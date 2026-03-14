export interface ResizeHandleOptions {
  container: HTMLElement;
  initialHeight: number;
  minHeight: number;
  maxHeightRatio: number;
  onResize?: () => void;
  onResizeEnd: (height: number) => void;
}

export class ResizeHandle {
  private container: HTMLElement;
  private minHeight: number;
  private maxHeightRatio: number;
  private onResize: (() => void) | undefined;
  private onResizeEnd: (height: number) => void;

  private handleEl: HTMLElement;
  private dragging = false;
  private startY = 0;
  private startHeight = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(options: ResizeHandleOptions) {
    this.container = options.container;
    this.minHeight = options.minHeight;
    this.maxHeightRatio = options.maxHeightRatio;
    this.onResize = options.onResize;
    this.onResizeEnd = options.onResizeEnd;

    // Create handle element at top of container
    this.handleEl = document.createElement("div");
    this.handleEl.className = "terminal-resize-handle";
    this.container.insertBefore(this.handleEl, this.container.firstChild);

    // Bind document-level handlers
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.handleEl.addEventListener("mousedown", this.onMouseDown.bind(this));
  }

  private getLeafElement(): HTMLElement | null {
    return this.container.closest(".workspace-leaf") as HTMLElement | null;
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const leaf = this.getLeafElement();
    if (!leaf) return;

    this.dragging = true;
    this.startY = e.clientY;
    this.startHeight = leaf.getBoundingClientRect().height;
    this.handleEl.classList.add("dragging");

    document.addEventListener("mousemove", this.boundMouseMove);
    document.addEventListener("mouseup", this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;

    const leaf = this.getLeafElement();
    if (!leaf) return;

    // Dragging up (negative deltaY) should increase height
    const deltaY = this.startY - e.clientY;
    const maxHeight = window.innerHeight * this.maxHeightRatio;
    const newHeight = Math.min(maxHeight, Math.max(this.minHeight, this.startHeight + deltaY));

    this.applyHeight(leaf, newHeight);
    this.onResize?.();
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragging) return;

    this.dragging = false;
    this.handleEl.classList.remove("dragging");

    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);

    const leaf = this.getLeafElement();
    if (leaf) {
      const finalHeight = leaf.getBoundingClientRect().height;
      this.onResizeEnd(finalHeight);
    }
  }

  private applyHeight(leaf: HTMLElement, height: number): void {
    leaf.style.height = `${height}px`;
    leaf.style.flexBasis = `${height}px`;
    leaf.style.flexGrow = "0";
    leaf.style.flexShrink = "0";
  }

  /** Apply saved height to a leaf element (for initial restoration) */
  static applyHeightToLeaf(leaf: HTMLElement, height: number): void {
    leaf.style.height = `${height}px`;
    leaf.style.flexBasis = `${height}px`;
    leaf.style.flexGrow = "0";
    leaf.style.flexShrink = "0";
  }

  dispose(): void {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    this.handleEl.remove();
  }
}
