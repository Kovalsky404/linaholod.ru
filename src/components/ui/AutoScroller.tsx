"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Лента, которая едет сама, но которую можно прокрутить руками.
 *
 * Почему не CSS-анимация (как было раньше). `transform: translateX` и
 * нативный скролл — две независимые величины: контейнер со сдвигом остаётся
 * прокрученным на 0, и стоит добавить `overflow-x: auto`, как пользователь
 * начинает тянуть содержимое, которое одновременно уезжает само. Здесь обе
 * силы действуют на ОДНО свойство — `scrollLeft`, поэтому конфликта нет.
 *
 * `children` — ОДНА копия содержимого. Дублирует компонент сам: сколько копий
 * нужно, зависит от ширины экрана (см. recalc), а не от разметки.
 *
 * Взаимодействие пользователя важнее: любое касание, колесо или клавиша
 * приостанавливают дрейф на IDLE_MS, иначе лента выдёргивала бы карточку
 * из-под пальца.
 */

/** Пауза дрейфа после последнего действия пользователя. */
const IDLE_MS = 1500;

export function AutoScroller({
  /** Секунд на прокрутку одной копии — тот же смысл, что у прежней анимации. */
  duration,
  direction,
  label,
  /** Классы зазора; одни и те же на дорожке и внутри копии. */
  gapClass,
  children,
}: {
  duration: number;
  direction: "left" | "right";
  label: string;
  gapClass: string;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** Ширина одной копии вместе с зазором до следующей = период петли. */
  const periodRef = useRef(0);
  const [copies, setCopies] = useState(2);

  // ── Сколько копий нужно ───────────────────────────────────────────────
  useEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    if (!box || !track) return;

    const recalc = () => {
      const first = track.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const period = first.offsetWidth + gap;
      if (period <= 0) return; // нет раскладки (jsdom) — мерить нечего
      periodRef.current = period;

      /**
       * Петля перескакивает назад на период, поэтому видимое окно при любом
       * положении внутри периода обязано попадать на реальный контент:
       * period + ширина экрана <= период × копий.
       *
       * Именно здесь ломалось на десктопе: при фиксированных двух копиях
       * одна копия (≈1344px) оказывалась уже экрана начиная с 1440px, петля
       * становилась недостижимой, и дрейф выключался совсем. На телефоне
       * копия шире экрана, поэтому там всё работало — и баг был не виден.
       */
      setCopies(Math.max(2, Math.ceil(box.clientWidth / period) + 1));
    };

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(box);
    return () => ro.disconnect();
    // copies в зависимостях нарочно: после добавления копий период не
    // меняется, но пересчёт дешёвый и защищает от гонки первого замера.
  }, [copies]);

  // ── Дрейф ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    /**
     * Позицию ведём отдельной переменной с дробной частью, а не читаем
     * scrollLeft перед каждым шагом.
     *
     * Chromium округляет scrollLeft при ЧТЕНИИ до целого, а шаг дрейфа — доли
     * пикселя за кадр. Схема «прочитал → прибавил → записал» теряла остаток
     * целиком: позиция вечно оставалась нулём, тут же срабатывала петля
     * «< 0 → прыжок на период», на следующем кадре обратно — и лента
     * дёргалась между краями каждый кадр вместо движения.
     */
    let posX = box.scrollLeft;
    let started = false;
    let raf = 0;
    let prev = 0;
    let idleUntil = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Клампим шаг: во вкладке, вернувшейся из фона, dt был бы огромным и
      // лента прыгнула бы на пол-экрана.
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      prev = now;

      const period = periodRef.current;
      // Петля недостижима — прокручивать нечего (мало отзывов на широком
      // экране). Лента просто стоит, руками её всё равно можно двигать.
      if (period <= 0 || box.scrollWidth - box.clientWidth < period - 1) return;

      // Лента, едущая вправо, движется к нулю — значит стартует с периода.
      if (!started) {
        started = true;
        if (direction === "right") {
          posX = period;
          box.scrollLeft = posX;
          return;
        }
      }

      // Пользователь мог прокрутить ленту сам — подхватываем его позицию,
      // иначе следующий кадр дрейфа отбросил бы её назад. Порог в пару
      // пикселей, потому что читаемый scrollLeft округлён.
      if (Math.abs(box.scrollLeft - posX) > 2) posX = box.scrollLeft;

      // Пауза после действия пользователя и режим «меньше движения» — ничего
      // не трогаем вообще: позиция пользователя остаётся его позицией.
      if (reduce.matches || now < idleUntil) return;

      posX += (period / duration) * dt * (direction === "left" ? 1 : -1);
      // Петля: под курсором те же самые пиксели, поэтому перескок незаметен.
      if (posX >= period) posX -= period;
      else if (posX < 0) posX += period;
      box.scrollLeft = posX;
    };
    raf = requestAnimationFrame(frame);

    const hold = () => {
      idleUntil = performance.now() + IDLE_MS;
    };
    const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    for (const e of events) box.addEventListener(e, hold, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      for (const e of events) box.removeEventListener(e, hold);
    };
  }, [duration, direction]);

  return (
    <div
      ref={boxRef}
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
      className="no-scrollbar w-full overflow-x-auto overscroll-x-contain scroll-auto"
    >
      <div ref={trackRef} className={`flex w-max items-start ${gapClass}`}>
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            className={`flex flex-none items-start ${gapClass}`}
            // Копии скрыты от скринридера: озвучивать одно и то же по нескольку
            // раз незачем. Фокусируемых элементов внутри быть не должно.
            aria-hidden={i > 0}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
