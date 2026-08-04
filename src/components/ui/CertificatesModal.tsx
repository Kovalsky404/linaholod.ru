"use client";

import Image from "next/image";
import { CTA } from "@/lib/site-config";
import { Modal } from "@/components/ui/Modal";
import type { ResolvedImage } from "@/sanity/types";

const PLACEHOLDER = "/images/placeholder.svg";

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
 *
 * Кадр приходит из Sanity (siteSettings.certificatesImage) в пропорции 4:5.
 * Пропорцию задаёт вёрстка, а не файл: object-cover обрежет любой другой
 * кадр по центру, поэтому колонка не поедет, даже если зальют горизонталь.
 */

const STEPS = [
  { n: "01", title: "Выбираете формат", note: "услугу или сумму" },
  { n: "02", title: "Оформляю макет", note: "пришлю файлом" },
  { n: "03", title: "Дарите", note: "получатель пишет мне" },
] as const;

export function CertificatesModal({
  open,
  onClose,
  image,
}: {
  open: boolean;
  onClose: () => void;
  image?: ResolvedImage;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Подарочный сертификат"
      size="xl"
      bare
    >
      <div className="flex flex-col md:w-[54rem] md:flex-row md:items-center">
        {/* Кадр: сверху на мобильном, слева на десктопе. На мобильном высота
            ограничена: кадр 4:5 во всю ширину занимал там весь первый экран,
            и заголовок с кнопкой уходили за сгиб — приходилось скроллить,
            чтобы понять, о чём окно. Пропорция 4:5 держится
            на ОБОИХ. Растягивать колонку на всю высоту панели нельзя: она вдвое
            уже своей высоты, и вертикальный кадр потерял бы почти половину
            ширины под обрез. shrink-0 — иначе текст справа сжимал бы колонку и
            пропорция всё равно поехала бы. */}
        <div className="bg-placeholder relative aspect-[4/5] max-h-[42svh] w-full md:max-h-none md:w-[44%] md:shrink-0 md:self-center">
          <Image
            src={image?.src ?? PLACEHOLDER}
            // Кадр декоративный: смысл окна несёт текст рядом. Пустой alt —
            // чтобы скринридер не зачитывал заглушку как фотографию.
            alt=""
            fill
            unoptimized={image?.unoptimized ?? true}
            sizes="(max-width: 767px) 100vw, 390px"
            className="object-cover"
          />
        </div>

        <div className="px-6 pt-10 pb-8 sm:px-12 sm:pt-12 sm:pb-10 md:flex-1">
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
            Когда не хочется дарить вещь. Сертификат действует на любую услугу —
            от консультации по стилю до разбора гардероба.
          </p>

          <ol className="border-foreground/10 mt-7 border-t sm:mt-8">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="border-foreground/10 flex gap-3 border-b py-3.5 sm:gap-4 sm:py-4"
              >
                <span
                  aria-hidden="true"
                  // Фиксированная ширина: без неё цифры разной ширины сдвигают
                  // заголовки шагов друг относительно друга.
                  className="heading-upper text-gray w-7 shrink-0 text-sm font-normal"
                >
                  {step.n}
                </span>
                {/* Заголовок и пояснение — в ОДНОМ блоке: перенос на узком
                  экране остаётся внутри него и не уезжает под номер. */}
                <p className="flex flex-1 flex-wrap items-baseline gap-x-2">
                  <span className="heading-upper text-foreground text-sm font-semibold">
                    {step.title}
                  </span>
                  <span className="text-muted text-sm leading-relaxed">
                    &mdash; {step.note}
                  </span>
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col items-start gap-3 sm:mt-9">
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
      </div>
    </Modal>
  );
}
