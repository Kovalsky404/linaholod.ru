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
  /**
   * "center" (по умолчанию) — окно по центру; "side" — панель во всю высоту
   * справа, выезжает сбоку (условия использования, длинные списки).
   */
  placement?: "center" | "side";
  /**
   * Куда поставить фокус при открытии. "first" (по умолчанию) — первый
   * интерактивный элемент. "panel" — сама панель: для окон, открывшихся БЕЗ
   * действия пользователя (приветственное предложение). Иначе браузер рисует
   * рамку фокуса на крестике, хотя человек ничего не нажимал, а Tab всё
   * равно ведёт на первый элемент.
   */
  initialFocus?: "first" | "panel";
};

// video[controls] включён намеренно: Chrome ставит такой плеер в порядок Tab.
// Без него список трапа расходится с браузерным, и «последним» считался бы не
// тот элемент — окажись видео в конце панели, Tab уводил бы фокус ИЗ модалки.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, video[controls], [tabindex]:not([tabindex="-1"])';

/** Фокусируемые элементы панели в порядке документа. */
function focusablesOf(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
}

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
  placement = "center",
  initialFocus = "first",
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
    const first = initialFocus === "first" ? focusablesOf(panel)[0] : null;
    (first ?? panel).focus();
  }, [open, initialFocus]);

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
      const items = focusablesOf(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;

      // Фокус на самой панели (initialFocus="panel"): Shift+Tab иначе ушёл
      // бы на элемент страницы ПЕРЕД панелью — то есть из модалки.
      if (active === panel) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
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
  const isSide = placement === "side";
  // Геометрия панели и её «въезд»: по центру — снизу на 8px, сбоку — справа.
  const panelLayout = isSide
    ? "h-full w-full max-w-[34rem]"
    : `max-h-[92vh] ${isXl ? "w-full max-w-[96vw] md:w-auto" : "w-full max-w-lg"}`;
  const panelMotion = isSide
    ? visible
      ? "translate-x-0 opacity-100"
      : "translate-x-8 opacity-0"
    : visible
      ? "translate-y-0 opacity-100"
      : "translate-y-2 opacity-0";
  return createPortal(
    <div
      onMouseDown={onOverlayMouseDown}
      className={`fixed inset-0 z-[100] flex transition-opacity duration-300 ease-out ${
        isSide
          ? "items-stretch justify-end p-0"
          : `items-center justify-center ${isXl ? "p-0 sm:p-4" : "p-5"}`
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
        className={`bg-background relative z-10 overflow-auto shadow-xl transition-[opacity,transform] duration-300 ease-out outline-none ${panelLayout} ${
          bare ? "" : "p-6 sm:p-8"
        } ${panelMotion}`}
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
