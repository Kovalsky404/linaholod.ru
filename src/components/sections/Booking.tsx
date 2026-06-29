"use client";

import { useId, useMemo, useRef, useState } from "react";
import { SOCIAL_LINKS } from "@/lib/site-config";
import type { ServiceView } from "@/sanity/types";
import { validateLead, type LeadErrors } from "@/lib/lead";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Select, type SelectOption } from "@/components/ui/Select";

type Status = "idle" | "sending" | "success" | "error";

/** Шаги «как проходит запись». */
const STEPS = [
  {
    n: "01",
    title: "Заявка",
    text: "Оставляете контакт — я отвечаю в течение дня и уточняю детали.",
  },
  {
    n: "02",
    title: "Знакомство",
    text: "Обсуждаем задачи, формат и подбираем подходящую услугу.",
  },
  {
    n: "03",
    title: "Работа",
    text: "Назначаем дату и приступаем — шопинг, разбор или консультация.",
  },
] as const;

/**
 * Секция-форма «Записаться» (id="book").
 *
 * Слева — приглашение, шаги записи и соцсети; справа — форма.
 * Поля: Имя (обяз.), Телефон/Telegram (обяз.), Услуга (кастомный select,
 * необяз.), Сообщение (необяз.) + honeypot. Состояния: idle/sending/success/error.
 * Контракт с /api/lead (payload) — без изменений.
 * services — список услуг (из Sanity с фолбэком) для select.
 * intro — приглашение (из Sanity bookingIntro, иначе дефолт).
 */
export function Booking({
  services,
  intro,
}: {
  services: ServiceView[];
  intro?: string;
}) {
  const formId = useId();
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // Опции услуги для select (значение = название, как раньше → payload не меняется).
  const serviceOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Не выбрано" },
      ...services.map((s) => ({
        value: s.title,
        label: `${s.title} — ${s.price}`,
      })),
    ],
    [services],
  );

  const fid = (n: string) => `${formId}-${n}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
      service: String(data.get("service") ?? ""),
      message: String(data.get("message") ?? ""),
      company: String(data.get("company") ?? ""), // honeypot
    };

    const clientErrors = validateLead(payload);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setStatus("idle");
      if (clientErrors.name) nameRef.current?.focus();
      else if (clientErrors.contact) contactRef.current?.focus();
      return;
    }

    // Согласие на обработку ПД обязательно (152-ФЗ): без него не отправляем.
    if (!consent) {
      setConsentError(true);
      setStatus("idle");
      consentRef.current?.focus();
      return;
    }
    setConsentError(false);

    setErrors({});
    setServerError("");
    setStatus("sending");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fields?: LeadErrors;
      };

      if (res.ok && json.ok) {
        setStatus("success");
        form.reset();
        setService("");
        setConsent(false);
        return;
      }

      if (json.fields) setErrors(json.fields);
      setServerError(json.error ?? "Не удалось отправить. Попробуйте позже.");
      setStatus("error");
    } catch {
      setServerError("Проблема с сетью. Попробуйте позже.");
      setStatus("error");
    }
  }

  const fieldBase =
    "form-field w-full border-2 border-foreground bg-background px-4 py-3 text-base text-foreground outline-none transition-colors duration-200 ease-out placeholder:text-gray focus:border-foreground focus:ring-2 focus:ring-foreground/20";

  return (
    <section
      id="book"
      className="scroll-mt-20 pb-8 sm:pb-28"
      aria-labelledby="book-heading"
    >
      <div className="container-site border-foreground/10 border-t pt-8 sm:pt-28">
        <Reveal>
          <SectionHeading id="book-heading">Записаться</SectionHeading>
        </Reveal>

        <div className="mt-8 grid gap-10 lg:mt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          {/* ЛЕВО: приглашение, шаги, контакты */}
          <Reveal className="flex flex-col">
            <p className="text-muted max-w-prose text-lg leading-relaxed sm:text-xl">
              {intro ??
                "Оставьте контакт — отвечу лично и помогу выбрать формат работы. Без обязательств: сначала обсудим задачу."}
            </p>

            <ol className="mt-10 flex flex-col">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="border-foreground/10 flex gap-5 border-t py-5 first:border-t-0 first:pt-0"
                >
                  <span
                    aria-hidden="true"
                    className="heading-upper text-gray text-sm font-normal"
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="heading-upper text-foreground text-base font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-muted mt-1 text-sm leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Соцсети */}
            <div className="border-foreground/10 mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-6">
              <span className="text-gray text-sm uppercase">Я в сетях:</span>
              {SOCIAL_LINKS.filter((s) => s.href && s.href !== "#").map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground text-sm uppercase transition-colors duration-200 ease-out"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </Reveal>

          {/* ПРАВО: форма */}
          <Reveal delay={80}>
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-6"
            >
              {/* Имя */}
              <div className="flex flex-col gap-2">
                <label htmlFor={fid("name")} className="text-sm uppercase">
                  Имя <span aria-hidden="true">*</span>
                </label>
                <input
                  ref={nameRef}
                  id={fid("name")}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  aria-required="true"
                  aria-invalid={errors.name ? "true" : undefined}
                  aria-describedby={errors.name ? fid("name-err") : undefined}
                  className={fieldBase}
                />
                {errors.name ? (
                  <p id={fid("name-err")} className="text-muted text-sm">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              {/* Контакт */}
              <div className="flex flex-col gap-2">
                <label htmlFor={fid("contact")} className="text-sm uppercase">
                  Телефон или Telegram <span aria-hidden="true">*</span>
                </label>
                <input
                  ref={contactRef}
                  id={fid("contact")}
                  name="contact"
                  type="text"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  aria-required="true"
                  aria-invalid={errors.contact ? "true" : undefined}
                  aria-describedby={
                    errors.contact ? fid("contact-err") : undefined
                  }
                  className={fieldBase}
                />
                {errors.contact ? (
                  <p id={fid("contact-err")} className="text-muted text-sm">
                    {errors.contact}
                  </p>
                ) : null}
              </div>

              {/* Услуга — кастомный select */}
              <div className="flex flex-col gap-2">
                <span id={fid("service-label")} className="text-sm uppercase">
                  Услуга
                </span>
                <Select
                  id={fid("service")}
                  name="service"
                  options={serviceOptions}
                  value={service}
                  onChange={setService}
                  placeholder="Не выбрано"
                  aria-labelledby={fid("service-label")}
                />
              </div>

              {/* Сообщение */}
              <div className="flex flex-col gap-2">
                <label htmlFor={fid("message")} className="text-sm uppercase">
                  Сообщение
                </label>
                <textarea
                  id={fid("message")}
                  name="message"
                  rows={4}
                  className={`${fieldBase} resize-y`}
                />
              </div>

              {/* Honeypot */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
              >
                <label htmlFor={fid("company")}>Компания (не заполнять)</label>
                <input
                  id={fid("company")}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Согласие на обработку ПД — обязательно (152-ФЗ) */}
              <div className="flex flex-col gap-1">
                <label className="text-muted flex items-start gap-3 text-sm leading-relaxed">
                  <input
                    ref={consentRef}
                    type="checkbox"
                    name="consent"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setConsentError(false);
                    }}
                    required
                    aria-required="true"
                    aria-invalid={consentError ? "true" : undefined}
                    aria-describedby={
                      consentError ? fid("consent-err") : undefined
                    }
                    className="border-foreground accent-foreground mt-0.5 h-5 w-5 shrink-0 cursor-pointer border-2"
                  />
                  <span>
                    Я даю{" "}
                    <a
                      href="/consent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline"
                    >
                      согласие на обработку персональных данных
                    </a>{" "}
                    и подтверждаю ознакомление с{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline"
                    >
                      Политикой
                    </a>
                    .
                  </span>
                </label>
                {consentError ? (
                  <p id={fid("consent-err")} className="text-muted text-sm">
                    Чтобы отправить заявку, отметьте согласие.
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-pill mt-2 px-8 py-4 text-base font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Отправка…" : "Отправить заявку"}
              </button>

              {/* Результат — role="status" */}
              <p
                role="status"
                aria-live="polite"
                className="min-h-[1.5rem] text-sm"
              >
                {status === "success" ? (
                  <span className="text-foreground">
                    Заявка отправлена! Скоро свяжусь с вами.
                  </span>
                ) : status === "error" ? (
                  <span className="text-muted">{serverError}</span>
                ) : null}
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
