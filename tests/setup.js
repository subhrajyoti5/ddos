import { afterEach, vi } from "vitest";

const originalFetch = globalThis.fetch;

/**
 * jsdom does not implement matchMedia; components must render the
 * reduced-motion-off path harmlessly.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  globalThis.fetch = originalFetch;
});
