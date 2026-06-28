"use client";

import { useEffect, useRef, useState } from "react";

type RevealOptions = {
  /** Доля элемента во вьюпорте для срабатывания (0–1). */
  threshold?: number;
  /** Сдвиг корневой области (например, "0px 0px -10% 0px"). */
  rootMargin?: string;
};

/**
 * Однократный reveal по скроллу на базе IntersectionObserver.
 *
 * Возвращает ref для целевого элемента и флаг `visible`.
 * При prefers-reduced-motion (или отсутствии IO/SSR) сразу отдаёт visible=true —
 * контент никогда не остаётся скрытым.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
) {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px" } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Без анимации (reduced-motion или нет IntersectionObserver) — показываем
    // сразу, но через rAF, чтобы не вызывать setState синхронно в эффекте.
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, visible };
}
