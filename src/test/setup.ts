import "@testing-library/jest-dom";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver (jsdom doesn't support it)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock HTMLCanvasElement.getContext (jsdom doesn't support canvas/WebGL)
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === "webgl" || contextId === "webgl2") {
    return null; // Component already guards: if (!gl) return;
  }
  if (contextId === "2d") {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Array(0) }),
      putImageData: () => {},
      createImageData: () => ([]),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
      canvas: this,
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as unknown as typeof HTMLCanvasElement.prototype.getContext;
