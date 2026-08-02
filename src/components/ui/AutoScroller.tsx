"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Лента, которая едет сама, но которую можно прокрутить руками.
 *
 * Почему не CSS-анимация (как было раньше). `transform: translateX` и
 * нативный скролл — две независимые величины: контейнер со сдвигом остаётся
 * прокрученным на 0, и стоит добавить `overflow-x: auto`, как пользователь
 * начинает тянуть содержимое, которое одновременно уезжает само. Здесь обе
 * силы действуют на ОДНО свойство — `scrollLeft`, поэтому конфликта нет.
 *
 * Ожидания к разметке: `children` содержат контент РОВНО ДВАЖДЫ (дубль —
 * с aria-hidden). Петля перескакивает на половину прокрутки, где под курсором
 * оказываются те же самые пиксели, — шва не видно.
 *
 * Взаимодействие пользователя важнее: любое касание, колесо или клавиша
 * приостанавливают дрейф на IDLE_MS, иначе лента выдёргивала бы карточку
 * из-под пальца.
 */

/** Пауза дрейфа после последнего действия пользователя. */
const IDLE_MS = 1500;

export function AutoScroller({
  /** Секунд на полный цикл — тот же смысл, что у прежней CSS-анимации. */
  duration,
  direction,
  label,
  className = "",
  children,
}: {
  duration: number;
  direction: "left" | "right";
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /** Ширина одной копии контента = половина всей прокручиваемой ширины. */
    let half = el.scrollWidth / 2;
    /**
     * Петля достижима, только если одна копия шире видимой области:
     * максимум прокрутки равен 2·half − clientWidth, и он должен дотягивать
     * до half. При коротком списке на широком экране лента просто стоит —
     * прокручивать там нечего, и дрейф упёрся бы в край.
     */
    const canLoop = () => half > el.clientWidth;

    const measure = () => {
      half = el.scrollWidth / 2;
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Правая лента едет к нулю, поэтому стартует из середины.
    if (direction === "right" && canLoop()) el.scrollLeft = half;

    /**
     * Позицию ведём отдельной переменной с дробной частью, а не читаем
     * scrollLeft перед каждым шагом.
     *
     * Chromium округляет scrollLeft при ЧТЕНИИ до целого, а шаг дрейфа — доли
     * пикселя за кадр (ширина копии за минуту). Схема «прочитал → прибавил →
     * записал» теряла остаток целиком: позиция вечно оставалась нулём, тут же
     * срабатывала петля «<= 0 → прыжок на half», на следующем кадре обратно —
     * и лента дёргалась между краями каждый кадр вместо движения.
     */
    let posX = el.scrollLeft;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let prev = 0;
    let idleUntil = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Клампим шаг: во вкладке, вернувшейся из фона, dt был бы огромным и
      // лента прыгнула бы на пол-экрана.
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      prev = now;

      if (!canLoop()) return;

      // Пользователь мог прокрутить ленту сам — подхватываем его позицию,
      // иначе следующий кадр дрейфа отбросил бы её назад. Порог в пару
      // пикселей, потому что читаемый scrollLeft округлён.
      if (Math.abs(el.scrollLeft - posX) > 2) posX = el.scrollLeft;

      // Пауза после действия пользователя и режим «меньше движения» — ничего
      // не трогаем вообще: позиция пользователя остаётся его позицией.
      if (reduce.matches || now < idleUntil) return;

      posX += (half / duration) * dt * (direction === "left" ? 1 : -1);
      // Петля: под курсором те же самые пиксели, поэтому перескок незаметен.
      if (posX >= half) posX -= half;
      else if (posX < 0) posX += half;
      el.scrollLeft = posX;
    };
    raf = requestAnimationFrame(frame);

    const hold = () => {
      idleUntil = performance.now() + IDLE_MS;
    };
    const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    for (const e of events) el.addEventListener(e, hold, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const e of events) el.removeEventListener(e, hold);
    };
  }, [duration, direction]);

  return (
    <div
      ref={ref}
      // tabIndex=0 обязателен: прокручиваемая область без него недоступна с
      // клавиатуры (WCAG 2.1.1) — стрелки в неё просто не попадут.
      tabIndex={0}
      role="group"
      aria-label={label}
      // scroll-auto — страховка, а не необходимость: scroll-behavior НЕ
      // наследуется, поэтому smooth у html (он там ради якорной навигации)
      // сюда сам не попадает. Но если правило когда-нибудь расширят до
      // глобального, перескок на стыке станет анимированным — вместо
      // мгновенного получится видимый пролёт по всем карточкам.
      // overscroll-x-contain — чтобы прокрутка ленты до края не листала
      // историю браузера свайпом и не тянула страницу вбок.
      className={`no-scrollbar w-full overflow-x-auto overscroll-x-contain scroll-auto ${className}`}
    >
      {children}
    </div>
  );
}
