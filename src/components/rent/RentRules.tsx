"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { TermsDrawer } from "@/components/ui/TermsDrawer";

const TITLE = "Правила аренды";

/**
 * «Правила аренды» — открывают боковую панель с полным списком, как
 * «Условия использования» у сертификата.
 *
 * variant="row" — строка между тонкими линиями со стрелкой (первый экран);
 * variant="pill" — обычная pill-кнопка (блок «Как арендовать»).
 */
export function RentRules({
  terms,
  variant = "row",
  className = "",
}: {
  terms: readonly string[];
  variant?: "row" | "pill";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "row" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`border-foreground/10 text-foreground group flex w-full items-center justify-between border-y py-5 text-left text-sm uppercase ${className}`}
        >
          {TITLE}
          <ChevronRight
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="text-gray group-hover:text-foreground transition-[color,transform] duration-200 ease-out group-hover:translate-x-0.5"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`btn-pill h-12 px-7 text-sm font-medium ${className}`}
        >
          {TITLE}
        </button>
      )}
      <TermsDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={TITLE}
        items={terms}
      />
    </>
  );
}
