"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";

/**
 * Боковая панель с пронумерованным списком условий: «Условия использования»
 * сертификата, «Правила аренды». Одна вёрстка на оба места, чтобы условия
 * на сайте выглядели одинаково.
 *
 * Номера 01/02/… — декоративные (aria-hidden): нумерацию для скринридера
 * даёт сам <ol>.
 */
export function TermsDrawer({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: readonly ReactNode[];
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} placement="side" bare>
      <div className="flex min-h-full flex-col">
        <h2 className="heading-upper text-foreground border-foreground/10 border-b px-6 pt-8 pr-16 pb-6 text-xl font-bold sm:px-10 sm:text-2xl">
          {title}
        </h2>
        <ol className="flex-1 px-6 py-4 sm:px-10">
          {items.map((term, i) => (
            <li
              key={i}
              className="border-foreground/10 flex gap-4 border-b py-4 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="heading-upper text-gray w-6 shrink-0 pt-0.5 text-sm"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-muted text-[0.9375rem] leading-relaxed">
                {term}
              </p>
            </li>
          ))}
        </ol>
        <div className="bg-background border-foreground/10 sticky bottom-0 border-t px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill h-12 w-full text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
