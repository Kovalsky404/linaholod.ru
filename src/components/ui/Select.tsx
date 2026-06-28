"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  /** Значение, которое уходит в форму (name). */
  value: string;
  /** Подпись в списке/кнопке. */
  label: string;
};

type SelectProps = {
  /** Имя скрытого input — для FormData (контракт формы не меняется). */
  name: string;
  options: readonly SelectOption[];
  /** Текущее значение (controlled). */
  value: string;
  onChange: (value: string) => void;
  /** Подпись, когда ничего не выбрано. */
  placeholder?: string;
  /** id кнопки — для связи с внешним <label htmlFor>. */
  id?: string;
  "aria-labelledby"?: string;
  className?: string;
};

/**
 * Доступный кастомный select (паттерн listbox).
 *
 * - button[aria-haspopup=listbox][aria-expanded] + ul[role=listbox] >
 *   li[role=option][aria-selected]; активная опция — aria-activedescendant.
 * - Клавиатура: ↑/↓ перемещение, Enter/Space выбор, Esc закрытие,
 *   Home/End к краям; печать буквы — переход к опции (typeahead).
 * - Выбранное значение зеркалится в скрытый <input name>, поэтому payload
 *   формы остаётся прежним.
 * - Анимация раскрытия ≤300мс ease-out; reduced-motion — через глобальную media.
 */
export function Select({
  name,
  options,
  value,
  onChange,
  placeholder = "Не выбрано",
  id,
  className = "",
  ...aria
}: SelectProps) {
  const listId = useId();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ buffer: string; timer: number | null }>({
    buffer: "",
    timer: null,
  });

  const selected = options.find((o) => o.value === value) ?? null;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const close = useCallback((focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  const openList = useCallback(() => {
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }, [options, value]);

  const choose = useCallback(
    (i: number) => {
      const opt = options[i];
      if (!opt) return;
      onChange(opt.value);
      close();
    },
    [options, onChange, close],
  );

  // Закрытие по клику вне компонента.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Держим активную опцию в зоне видимости списка.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(optionId(activeIndex))}`,
    );
    el?.scrollIntoView({ block: "nearest" });
    // optionId — стабильна при том же baseId/индексе.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  const moveBy = (delta: number) =>
    setActiveIndex((i) => {
      const n = options.length;
      return (((i + delta) % n) + n) % n;
    });

  const onTypeahead = (key: string) => {
    const t = typeahead.current;
    if (t.timer) window.clearTimeout(t.timer);
    t.buffer += key.toLowerCase();
    const found = options.findIndex((o) =>
      o.label.toLowerCase().startsWith(t.buffer),
    );
    if (found >= 0) setActiveIndex(found);
    t.timer = window.setTimeout(() => (t.buffer = ""), 600);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else moveBy(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList();
        else moveBy(-1);
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openList();
        else choose(activeIndex);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (open) setOpen(false);
        break;
      default:
        if (open && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          onTypeahead(e.key);
        }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Скрытый input — значение уходит в FormData как раньше. */}
      <input type="hidden" name={name} value={value} />

      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={aria["aria-labelledby"]}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="border-foreground bg-background text-foreground focus:ring-foreground/20 flex w-full items-center justify-between border-2 px-4 py-3 text-left text-base transition-colors duration-200 ease-out outline-none focus:ring-2"
      >
        <span className={selected ? "text-foreground" : "text-gray"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={20}
          strokeWidth={2}
          aria-hidden="true"
          className={`text-foreground transition-transform duration-200 ease-out ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Список опций */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={aria["aria-labelledby"]}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        tabIndex={-1}
        className={`border-foreground bg-background absolute z-30 mt-1 max-h-64 w-full origin-top overflow-auto border-2 shadow-lg transition-[opacity,transform] duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        {options.map((opt, i) => {
          const isSelected = opt.value === value;
          const isActive = i === activeIndex;
          return (
            <li
              key={opt.value || "empty"}
              id={optionId(i)}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(i)}
              className={`cursor-pointer px-4 py-3 text-base transition-colors duration-150 ease-out ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-foreground bg-background"
              } ${isSelected && !isActive ? "font-semibold" : ""}`}
            >
              {opt.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
