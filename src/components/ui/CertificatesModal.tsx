"use client";

import { CTA } from "@/lib/site-config";
import { Modal } from "@/components/ui/Modal";

/**
 * Подарочные сертификаты — модалка из шапки.
 *
 * Оформление намеренно повторяет уже сложившийся язык сайта, а не изобретает
 * новый: английский кикер капсом с буллитами (как подзаголовки работ в
 * портфолио), нумерация 01/02/03 (как шаги в секции «Записаться»),
 * тонкие разделители и много воздуха. Так окно читается частью сайта,
 * а не вставкой.
 *
 * Продажа идёт в Telegram: сайт не собирает персональные данные и не
 * принимает оплату (см. решение об отказе от формы заявки).
 */

const STEPS = [
  {
    n: "01",
    title: "Выбираете формат",
    text: "Конкретная услуга или сумма на ваше усмотрение — получатель сам решит, на что её потратить.",
  },
  {
    n: "02",
    title: "Оформляю сертификат",
    text: "Присылаю готовый макет в электронном виде. Можно отправить сообщением или распечатать.",
  },
  {
    n: "03",
    title: "Дарите",
    text: "Получатель пишет мне, и мы договариваемся о встрече в удобное для него время.",
  },
] as const;

export function CertificatesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Подарочный сертификат" bare>
      <div className="px-6 pt-10 pb-8 sm:px-12 sm:pt-14 sm:pb-12">
        {/* Кикер — тот же приём, что у подзаголовков работ в портфолио.
            pr-10 держит его подальше от крестика закрытия в правом верхнем
            углу: на узком экране строка иначе уходит под него. */}
        <p className="heading-upper text-gray pr-10 text-xs font-normal">
          Gift&nbsp;certificate&nbsp;•&nbsp;на&nbsp;любую&nbsp;услугу
        </p>

        <h3
          className="heading-upper text-foreground mt-3 font-bold"
          style={{ fontSize: "clamp(1.75rem,4.5vw,3rem)", lineHeight: 1.05 }}
        >
          Подарочный
          <br />
          сертификат
        </h3>

        <p className="text-muted mt-5 max-w-prose text-base leading-relaxed sm:mt-6 sm:text-lg">
          Хороший подарок, когда не хочется дарить вещь. Сертификат подойдёт на
          любую услугу — от консультации по стилю до полного разбора гардероба
          или образа на важное событие.
        </p>

        <ol className="border-foreground/10 mt-8 border-t sm:mt-10">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="border-foreground/10 flex gap-4 border-b py-5 sm:gap-6 sm:py-6"
            >
              <span
                aria-hidden="true"
                // Фиксированная ширина: без неё цифры разной ширины сдвигают
                // заголовки шагов друг относительно друга.
                className="heading-upper text-gray w-7 shrink-0 text-sm font-normal"
              >
                {step.n}
              </span>
              <div>
                <h4 className="heading-upper text-foreground text-base font-semibold">
                  {step.title}
                </h4>
                <p className="text-muted mt-1 text-sm leading-relaxed">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col items-start gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={CTA.href}
            target="_blank"
            rel="noopener noreferrer"
            // whitespace-nowrap: в строке с текстом справа кнопка ужималась
            // и «КУПИТЬ В TELEGRAM» ломалось на две строки.
            className="btn-pill w-full px-6 py-3.5 text-sm font-medium whitespace-nowrap sm:w-auto sm:px-8"
          >
            Купить в Telegram
          </a>
          <p className="text-gray text-sm leading-relaxed">
            Отвечу лично и оформлю сертификат.
          </p>
        </div>
      </div>
    </Modal>
  );
}
