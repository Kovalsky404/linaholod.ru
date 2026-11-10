"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { telegramMessage } from "@/lib/site-config";

/** Ключ в localStorage. Версия в имени — чтобы новую акцию показать заново. */
export const WELCOME_OFFER_KEY = "lh:welcome-offer:v1";

/** Пауза перед показом: сначала человек видит сайт, потом — предложение. */
export const WELCOME_OFFER_DELAY_MS = 3000;

/** Повторная попытка, если в момент показа открыто меню или другое окно. */
const RETRY_MS = 2000;

const MESSAGE =
  "Здравствуйте! Пишу с сайта — хочу воспользоваться скидкой 10% на первый заказ.";

/**
 * Приветственное окно «−10% на первый заказ».
 *
 * Показывается ОДИН раз на браузер: отметка ставится в момент показа, а не
 * закрытия — иначе перезагрузка страницы с открытым окном показала бы его
 * снова. Если localStorage недоступен (приватный режим, запрет cookies),
 * окно не показывается вовсе: запомнить отказ нельзя, а всплывать на каждой
 * странице — навязчиво.
 *
 * Не перебивает другие окна: если в момент показа заблокирован скролл body
 * (открыто мобильное меню, модалка портфолио или условия сертификата), ждёт
 * и пробует снова.
 *
 * Скидку сайт не «выдаёт» и данных не собирает: кнопка открывает рабочий
 * Telegram с уже набранным сообщением, дальше — разговор с менеджером.
 */
export function WelcomeOffer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen: boolean;
    try {
      seen = window.localStorage.getItem(WELCOME_OFFER_KEY) !== null;
    } catch {
      return;
    }
    if (seen) return;

    let timer: ReturnType<typeof setTimeout>;
    const tryOpen = () => {
      if (document.body.style.overflow === "hidden") {
        timer = setTimeout(tryOpen, RETRY_MS);
        return;
      }
      try {
        window.localStorage.setItem(WELCOME_OFFER_KEY, String(Date.now()));
      } catch {
        return;
      }
      setOpen(true);
    };
    timer = setTimeout(tryOpen, WELCOME_OFFER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Скидка 10% на первый заказ"
      initialFocus="panel"
      bare
    >
      <div className="px-7 pt-12 pb-8 sm:px-12 sm:pt-14 sm:pb-11">
        {/* Кикер в мотиве скобок, как заголовки секций сайта. pr-10 — не
            заезжать под крестик закрытия. */}
        <p className="heading-upper text-foreground pr-10 text-xs font-semibold">
          <span className="text-gray font-normal italic" aria-hidden="true">
            [&nbsp;
          </span>
          Для новых клиентов
          <span className="text-gray font-normal italic" aria-hidden="true">
            &nbsp;]
          </span>
        </p>

        {/* Гигантская цифра — тот же приём, что STYLIST в «Обо мне». Контраст
            начертаний (Black у числа, Regular у знака) вместо обводки: у «%» в
            Inter круглые счётчики, и в контуре он читался как «⁰⁄₀». Для
            скринридера смысл несёт заголовок ниже, цифра декоративна. */}
        <p
          aria-hidden="true"
          className="heading-upper text-foreground mt-6 whitespace-nowrap select-none"
          style={{ fontSize: "clamp(5.5rem, 27vw, 9.5rem)", lineHeight: 0.8 }}
        >
          <span className="font-black">−10</span>
          <span className="font-normal">%</span>
        </p>

        <h2 className="heading-upper text-foreground border-foreground/10 mt-8 border-t pt-6 text-2xl font-bold sm:text-3xl">
          На первый заказ
        </h2>
        <p className="text-muted mt-3 text-base leading-relaxed">
          Напишите в&nbsp;Telegram, что вы с&nbsp;сайта, — и&nbsp;скидка 10%
          применится к&nbsp;вашему первому заказу.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <a
            href={telegramMessage(MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="btn-solid w-full px-6 py-4 text-sm font-medium"
          >
            Получить скидку в Telegram
          </a>
          <button
            type="button"
            onClick={close}
            className="text-gray hover:text-foreground py-2 text-sm transition-colors duration-200 ease-out"
          >
            Не сейчас
          </button>
        </div>
      </div>
    </Modal>
  );
}
