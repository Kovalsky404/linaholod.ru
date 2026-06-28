"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Заголовок для встроенной шапки и aria-label панели. */
  title: string;
  children: ReactNode;
  /** Ширина панели: "md" (по умолчанию) или "xl" для детальных раскладок. */
  size?: "md" | "xl";
  /**
   * Спрятать встроенную шапку (h3 + отступы), чтобы контент сам управлял
   * раскладкой. Заголовок всё равно связывается с диалогом через aria-label.
   */
  bare?: boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Доступная модалка.
 *
 * - role="dialog" aria-modal, заголовок связан через aria-labelledby;
 * - focus-trap по Tab/Shift+Tab, автофокус внутрь при открытии;
 * - закрытие по Escape и клику на оверлей;
 * - возврат фокуса на элемент, который открыл модалку;
 * - блокировка скролла body;
 * - появление/исчезание ≤300мс ease-out, reduced-motion обрабатывается
 *   глобальной media-query (длительности обнуляются).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  bare = false,
}: ModalProps) {
  const labelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
    }
    // rAF, чтобы не вызывать setState синхронно в эффекте и дать кадр на анимацию.
    const id = requestAnimationFrame(() => setVisible(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Фокус внутрь при открытии.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
  }, [open]);

  // Блокировка скролла + Escape + focus-trap, пока открыто.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose]);

  // Возврат фокуса на открывавший элемент при закрытии.
  useEffect(() => {
    if (open) return;
    previouslyFocused.current?.focus?.();
  }, [open]);

  const onOverlayMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Портал доступен только в браузере (компонент клиентский).
  if (!open || typeof document === "undefined") return null;

  const isXl = size === "xl";
  return createPortal(
    <div
      onMouseDown={onOverlayMouseDown}
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ease-out ${
        isXl ? "p-0 sm:p-4" : "p-5"
      } ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Оверлей */}
      <div className="bg-foreground/40 absolute inset-0" aria-hidden="true" />

      {/* Панель */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={bare ? title : undefined}
        aria-labelledby={bare ? undefined : labelId}
        tabIndex={-1}
        className={`bg-background relative z-10 max-h-[92vh] overflow-auto shadow-xl transition-[opacity,transform] duration-300 ease-out outline-none ${
          isXl ? "w-full max-w-[96vw] md:w-auto" : "w-full max-w-lg"
        } ${bare ? "" : "p-6 sm:p-8"} ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="text-foreground/60 hover:text-foreground absolute top-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center transition-colors duration-200 ease-out"
        >
          <X size={24} strokeWidth={2} />
        </button>

        {bare ? (
          children
        ) : (
          <>
            <h3
              id={labelId}
              className="heading-upper text-foreground pr-10 text-2xl font-bold sm:text-3xl"
            >
              {title}
            </h3>
            <div className="text-muted mt-4 text-base leading-relaxed">
              {children}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
