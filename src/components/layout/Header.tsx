"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND, CTA, NAV_LINKS } from "@/lib/site-config";

// Две группы десктоп-навигации, как в макете (узел Figma 18:30):
// слева у логотипа — Обо мне / Услуги / Портфолио, справа у CTA — Отзывы / Контакты.
const LEFT_NAV = NAV_LINKS.filter((l) =>
  ["#about", "#services", "#portfolio"].includes(l.href),
);
const RIGHT_NAV = NAV_LINKS.filter((l) =>
  ["#reviews", "#contacts"].includes(l.href),
);

const navItemClass =
  "text-foreground/80 hover:text-foreground text-sm uppercase transition-colors duration-200 ease-out";

/**
 * Шапка сайта.
 *
 * Поведение:
 * - sticky сверху; фон/блюр и нижняя граница появляются только после скролла,
 *   чтобы на самом верху шапка «растворялась» в hero (impeccable: тихий хром).
 * - десктоп: две группы меню как в макете — слева у логотипа (Обо мне /
 *   Услуги / Портфолио), справа у pill-кнопки «Записаться» (Отзывы / Контакты).
 * - мобайл: логотип + бургер; по тапу — полноэкранное меню с анимацией,
 *   блокировкой скролла, закрытием по Escape и якорю.
 * - smooth-scroll к секциям обеспечивается scroll-behavior на <html> и
 *   scroll-margin-top на секциях; всё уважает prefers-reduced-motion.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Появление фона шапки после небольшого скролла.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Блокировка скролла body и закрытие по Escape, пока открыто мобильное меню.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    // ВАЖНО: на <header> НЕТ backdrop-filter/transform — иначе он стал бы
    // containing-block для position:fixed мобильного меню (меню «схлопывалось»
    // и контент просвечивал). Блюр/фон живут на внутренней полосе ниже.
    <header className="sticky top-0 z-50">
      {/* Полоса шапки: фон/блюр и нижняя граница появляются после скролла.
          data-scrolled — честный сигнал состояния (класс — только визуал). */}
      <div
        data-scrolled={scrolled}
        className={`transition-[background-color,border-color,backdrop-filter] duration-200 ease-out ${
          scrolled
            ? "bg-background/80 border-foreground/10 border-b backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        {/* Три зоны: лево — центр (логотип) — право. grid-cols-[1fr_auto_1fr]
            держит логотип строго по центру при любой длине пунктов меню. */}
        <div className="container-site grid h-14 grid-cols-[1fr_auto_1fr] items-center sm:h-20">
        {/* Левая зона: десктоп — левая группа меню; мобайл — бургер */}
        <div className="flex items-center justify-start">
          {/* Бургер (мобайл/планшет) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            className="text-foreground -ml-1 inline-flex h-11 w-11 items-center justify-center lg:hidden"
          >
            {open ? (
              <X size={28} strokeWidth={2} />
            ) : (
              <Menu size={28} strokeWidth={2} />
            )}
          </button>

          {/* Левая группа меню (десктоп) */}
          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-8 lg:flex xl:gap-10"
          >
            {LEFT_NAV.map((link) => (
              <a key={link.href} href={link.href} className={navItemClass}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Центр: логотип */}
        <a
          href="#top"
          className="heading-upper text-foreground justify-self-center text-xl font-bold sm:text-3xl"
          aria-label={`${BRAND.name} — на главную`}
        >
          {BRAND.name}
        </a>

        {/* Правая зона: правая группа меню + CTA (десктоп). На мобайле пусто —
            grid сохраняет логотип по центру. */}
        <div className="hidden items-center justify-end gap-8 lg:flex xl:gap-10">
          <nav
            aria-label="Дополнительная навигация"
            className="flex items-center gap-8"
          >
            {RIGHT_NAV.map((link) => (
              <a key={link.href} href={link.href} className={navItemClass}>
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={CTA.href}
            className="btn-pill px-5 py-2.5 text-sm font-medium"
          >
            {CTA.label}
          </a>
        </div>
        </div>
      </div>

      {/* Мобильное меню — СИБЛИНГ полосы шапки (не вложено в блюр-контейнер),
          fixed считается от вьюпорта и перекрывает контент непрозрачным фоном. */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`bg-background fixed inset-x-0 top-14 bottom-0 z-40 origin-top transition-[opacity,transform] duration-300 ease-out sm:top-20 lg:hidden ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <nav
          aria-label="Мобильная навигация"
          className="flex h-full flex-col gap-2 overflow-y-auto px-5 pt-6 pb-12"
        >
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
              className={`heading-upper text-foreground border-foreground/10 border-b py-4 text-3xl font-bold transition-[opacity,transform] duration-300 ease-out ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              {link.label}
            </a>
          ))}

          <a
            href={CTA.href}
            onClick={close}
            className="btn-pill mt-auto w-full px-6 py-4 text-base font-medium"
          >
            {CTA.label}
          </a>
        </nav>
      </div>
    </header>
  );
}
