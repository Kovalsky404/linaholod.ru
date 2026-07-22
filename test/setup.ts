// Матчеры jest-dom (toBeInTheDocument, toHaveTextContent, …) для Vitest.
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom-гэпы, нужные компонентным тестам (RTL). Guard по window — чтобы
// node-окружение (route/lead/telegram/content/seo) их пропускало и не падало.
if (typeof window !== "undefined") {
  // useReveal читает matchMedia("(prefers-reduced-motion: reduce)").matches.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  // Select вызывает scrollIntoView при открытии/движении активной опции.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // IntersectionObserver в jsdom отсутствует. Стаб сразу «показывает» элемент
  // (isIntersecting:true), чтобы Reveal-контент был видим детерминированно.
  if (typeof globalThis.IntersectionObserver === "undefined") {
    class IOStub implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      constructor(private cb: IntersectionObserverCallback) {}
      observe(el: Element) {
        this.cb(
          [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
          this,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    globalThis.IntersectionObserver =
      IOStub as unknown as typeof IntersectionObserver;
  }
}
