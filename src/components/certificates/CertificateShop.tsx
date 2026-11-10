"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronRight, Mail } from "lucide-react";
import {
  CERTIFICATE_AMOUNTS,
  CERTIFICATE_DESIGNS,
  CERTIFICATE_MAIL_SUBJECT,
  DEFAULT_AMOUNT,
  MAX_AMOUNT,
  MIN_AMOUNT,
  certificateRequest,
  formatRub,
  isValidAmount,
  type CertificateDesign,
} from "@/lib/certificates";
import { mailMessage, telegramMessage } from "@/lib/site-config";
import { TermsDrawer } from "@/components/ui/TermsDrawer";
import { TelegramGlyph } from "@/components/ui/SocialIcon";

// noUncheckedIndexedAccess: массив непустой по построению, проверка — для типов.
const FIRST_DESIGN = CERTIFICATE_DESIGNS[0] as CertificateDesign;

/** Подпись-кикер над группой: мелкий серый капс, как на референсе. */
const kickerClass = "heading-upper text-gray text-xs font-normal tracking-wide";

/** Обводка выбранного: та же «чёрная рамка», что у pill-кнопок сайта. */
const chipClass =
  "border-foreground/15 text-foreground peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground peer-focus-visible:outline-foreground hover:border-foreground flex h-11 w-full items-center justify-center rounded-[var(--radius-pill)] border px-2 text-sm whitespace-nowrap transition-colors duration-200 ease-out peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2";

/**
 * Пункты условий. Номера пунктов не хранятся в тексте — их ставит список.
 * Пункт про возврат собирается с учётом того, есть ли почта: без неё
 * обещать «напишите на почту» нельзя.
 */
function termsList(email?: string): ReactNode[] {
  return [
    "Срок действия сертификата — 1 год.",
    `Номинал сертификата вы определяете сами — от ${formatRub(MIN_AMOUNT)} до ${formatRub(MAX_AMOUNT)} рублей.`,
    "Виртуальный сертификат будет отправлен в СМС, вы можете указать дату и время доставки.",
    "Сертификат действует на все услуги стилиста и аренду одежды.",
    "Сумму сертификата можно использовать для оплаты части или всего заказа, оплатить доставку или разделить на несколько покупок.",
    "Если заказ дороже номинала, разницу можно доплатить.",
    "Неиспользованный остаток сохраняется до конца срока действия сертификата.",
    email ? (
      <>
        Чтобы вернуть подарочный сертификат, напишите менеджеру в{" "}
        <TermsLink
          href={telegramMessage(
            "Здравствуйте! Хочу вернуть подарочный сертификат.",
          )}
        >
          Telegram
        </TermsLink>{" "}
        или на&nbsp;почту{" "}
        <TermsLink href={`mailto:${email}`}>{email}</TermsLink>.
      </>
    ) : (
      <>
        Чтобы вернуть подарочный сертификат, напишите менеджеру в{" "}
        <TermsLink
          href={telegramMessage(
            "Здравствуйте! Хочу вернуть подарочный сертификат.",
          )}
        >
          Telegram
        </TermsLink>
        .
      </>
    ),
  ];
}

function TermsLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-foreground underline decoration-1 underline-offset-4"
    >
      {children}
    </a>
  );
}

/**
 * Страница-витрина подарочного сертификата (по мотивам референса).
 *
 * Слева — крупная «карта» в выбранном дизайне на тёплой подложке, под ней
 * сумма. Справа — выбор дизайна, номинала (готовый или свой) и покупка.
 *
 * Покупка без формы и без оплаты на сайте: «Купить сертификат» раскрывает
 * две кнопки — Telegram и почта. Обе открывают сообщение, в котором уже
 * стоят сумма и дизайн; дальше — менеджер. Сайт ничего не собирает.
 *
 * Кнопка «По почте» показывается, только если почта задана (Studio →
 * Настройки сайта → E-mail): кнопка в никуда хуже отсутствующей.
 */
export function CertificateShop({ email }: { email?: string }) {
  const [design, setDesign] = useState<CertificateDesign>(FIRST_DESIGN);
  const [preset, setPreset] = useState<number | null>(DEFAULT_AMOUNT);
  const [custom, setCustom] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const firstOptionRef = useRef<HTMLAnchorElement>(null);
  const ids = {
    options: useId(),
    error: useId(),
    custom: useId(),
  };

  const amount = custom ? Number(custom) : preset;
  const valid = isValidAmount(amount);
  // Ошибку показываем, когда человек уже ввёл свою сумму или попытался купить
  // без суммы, — а не сразу при открытии страницы.
  const showError = !valid && (custom !== "" || attempted);
  const message = valid ? certificateRequest(amount, design) : "";
  const optionsShown = revealed && valid;

  const buy = () => {
    setAttempted(true);
    if (!valid) return;
    if (revealed) {
      firstOptionRef.current?.focus();
      return;
    }
    setRevealed(true);
  };

  return (
    <>
      <div className="mt-5 grid gap-8 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-20">
        {/* ── Витрина: выбранный дизайн крупно ── */}
        <div className="bg-surface flex flex-col items-center justify-center gap-6 px-5 py-10 sm:px-12 sm:py-16 lg:sticky lg:top-24 lg:min-h-[calc(100svh-8rem)] lg:self-start">
          <div className="relative aspect-[3/2] w-full max-w-[52rem] overflow-hidden rounded-[10px] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.45)] sm:rounded-[14px]">
            {/* Все дизайны лежат стопкой, видим один — смена мгновенная и
                с плавным переходом, без ожидания загрузки по клику. */}
            {CERTIFICATE_DESIGNS.map((d) => {
              const active = d.id === design.id;
              return (
                <Image
                  key={d.id}
                  src={d.image}
                  alt={
                    active
                      ? `Подарочный сертификат lina H., дизайн «${d.name}»: ${d.alt}`
                      : ""
                  }
                  aria-hidden={active ? undefined : true}
                  fill
                  preload={d.id === FIRST_DESIGN.id}
                  sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 160px), 832px"
                  className={`object-cover transition-opacity duration-500 ease-out ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
              );
            })}
          </div>

          <p className="text-center" aria-live="polite">
            <span className={`${kickerClass} block`}>Сертификат на сумму</span>
            <span className="heading-upper text-foreground mt-2 block text-xl font-semibold sm:text-2xl">
              {valid ? `${formatRub(amount)} ₽` : "—"}
            </span>
          </p>
        </div>

        {/* ── Выбор и покупка ── */}
        <div className="flex flex-col">
          <p className={kickerClass}>
            Gift&nbsp;certificate&nbsp;•&nbsp;lina&nbsp;H.
          </p>
          <h1
            className="heading-upper text-foreground mt-3 font-bold"
            style={{
              fontSize: "clamp(1.875rem,3.2vw,2.75rem)",
              lineHeight: 1.02,
            }}
          >
            Подарочный сертификат
          </h1>

          {/* Дизайн: нативные radio — стрелки и Tab работают сами. */}
          <fieldset className="mt-8">
            <legend className={kickerClass}>
              Дизайн — <span className="text-foreground">{design.name}</span>
            </legend>
            {/* Пять в ряд на любой ширине: сетка делит строку поровну, и
                на телефоне миниатюры не переносятся 4+1. */}
            <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-2.5">
              {CERTIFICATE_DESIGNS.map((d) => (
                <label key={d.id} className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="certificate-design"
                    value={d.id}
                    checked={d.id === design.id}
                    onChange={() => setDesign(d)}
                    className="peer sr-only"
                  />
                  <span className="ring-foreground/10 peer-checked:ring-foreground peer-focus-visible:outline-foreground relative block aspect-[3/2] w-full overflow-hidden rounded-[6px] ring-1 transition-shadow duration-200 ease-out peer-checked:ring-2 peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4">
                    <Image
                      src={d.image}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </span>
                  <span className="sr-only">{d.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Номинал: готовые суммы или своя. */}
          <fieldset className="mt-8">
            <legend className={kickerClass}>
              Выберите номинал или введите сумму
            </legend>
            {/* Три в ряд: пять номиналов ложатся 3+2, как на референсе, а не
                4+1 с одиноким хвостом. */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {CERTIFICATE_AMOUNTS.map((value) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="certificate-amount"
                    value={value}
                    checked={!custom && preset === value}
                    onChange={() => {
                      setPreset(value);
                      setCustom("");
                    }}
                    className="peer sr-only"
                  />
                  <span className={chipClass}>{formatRub(value)}&nbsp;₽</span>
                </label>
              ))}
            </div>

            <label htmlFor={ids.custom} className="sr-only">
              Своя сумма, от {formatRub(MIN_AMOUNT)} до {formatRub(MAX_AMOUNT)}{" "}
              рублей
            </label>
            {/* «₽» — отдельной подписью поверх поля, а НЕ частью значения:
                иначе Backspace в конце стирал бы «₽», форматирование тут же
                возвращало бы его, и удалить цифру было бы невозможно. */}
            <div className="relative mt-3">
              <input
                id={ids.custom}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={`Своя сумма: ${formatRub(MIN_AMOUNT)} – ${formatRub(MAX_AMOUNT)} ₽`}
                value={custom ? formatRub(Number(custom)) : ""}
                onChange={(e) => {
                  // Только цифры: пробелы из отображения отбрасываются. Семь
                  // знаков — с запасом, чтобы ошибка «больше 500 000» была
                  // видна, а не молча обрезалась.
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                  setCustom(digits.replace(/^0+/, ""));
                  if (!digits) setPreset(null);
                }}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? ids.error : undefined}
                className={`bg-surface text-foreground placeholder:text-gray h-12 w-full rounded-[var(--radius-pill)] border px-5 pr-10 text-sm transition-colors duration-200 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  custom
                    ? "border-foreground"
                    : "focus:border-foreground border-transparent"
                }`}
              />
              {custom ? (
                <span
                  aria-hidden="true"
                  className="text-foreground pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-sm"
                >
                  ₽
                </span>
              ) : null}
            </div>
            {showError ? (
              <p
                id={ids.error}
                className="text-danger mt-2 text-sm"
                role="alert"
              >
                {custom
                  ? `Сумма — от ${formatRub(MIN_AMOUNT)} до ${formatRub(MAX_AMOUNT)} ₽`
                  : "Выберите номинал или введите сумму"}
              </p>
            ) : null}
          </fieldset>

          {/* Покупка: кнопка раскрывает два способа связи. */}
          <button
            type="button"
            onClick={buy}
            aria-expanded={optionsShown}
            aria-controls={ids.options}
            className="btn-solid mt-8 h-14 w-full px-6 text-sm font-medium"
          >
            Купить сертификат
          </button>

          {/* grid-rows 0fr→1fr — плавное раскрытие на настоящую высоту, без
              магических max-height. Свёрнутый блок inert: Tab в него не
              заходит, скринридер не зачитывает. */}
          <div
            id={ids.options}
            inert={!optionsShown}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              optionsShown
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2.5 pt-3 sm:flex-row">
                <a
                  ref={firstOptionRef}
                  href={telegramMessage(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill h-12 px-5 text-sm font-medium sm:flex-1"
                >
                  <TelegramGlyph width={18} height={18} />В Telegram
                </a>
                {email ? (
                  <a
                    href={mailMessage(email, CERTIFICATE_MAIL_SUBJECT, message)}
                    className="btn-pill h-12 px-5 text-sm font-medium sm:flex-1"
                  >
                    <Mail size={18} strokeWidth={2} aria-hidden="true" />
                    По почте
                  </a>
                ) : null}
              </div>
              <p className="text-gray mt-3 text-sm leading-relaxed">
                Сумма и дизайн уже будут в сообщении. Менеджер ответит, примет
                оплату и пришлёт сертификат.
              </p>
            </div>
          </div>

          <div className="border-foreground/10 mt-8 border-t pt-7">
            <p className="text-muted text-base leading-relaxed">
              Сертификат lina H. — самый простой способ подарить близкому
              человеку то, о чём он мечтал: консультацию стилиста, разбор
              гардероба, шопинг или образ из аренды. Получатель сам выберет
              услугу и удобную дату.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            aria-haspopup="dialog"
            className="border-foreground/10 text-foreground group mt-7 flex w-full items-center justify-between border-y py-5 text-left text-sm uppercase"
          >
            Условия использования
            <ChevronRight
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className="text-gray group-hover:text-foreground transition-[color,transform] duration-200 ease-out group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>

      <TermsDrawer
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Условия использования"
        items={termsList(email)}
      />
    </>
  );
}
