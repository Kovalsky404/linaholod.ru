import { CTA } from "@/lib/site-config";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Шаги «как проходит запись». */
const STEPS = [
  {
    n: "01",
    title: "Пишете в Telegram",
    text: "Оставляете сообщение — я отвечаю в течение дня и уточняю детали.",
  },
  {
    n: "02",
    title: "Знакомство",
    text: "Обсуждаем задачи, формат и подбираем подходящую услугу.",
  },
  {
    n: "03",
    title: "Работа",
    text: "Назначаем дату и приступаем — разбор гардероба, шопинг, консультация, образ на мероприятие или стилизация съёмки.",
  },
] as const;

/**
 * Секция «Записаться» (id="book").
 *
 * Формы заявки НЕТ: сайт не собирает персональные данные (вне 152-ФЗ).
 * Слева — приглашение и шаги записи; справа — карточка с кнопкой, ведущей
 * в Telegram-чат. Соцсети из секции убраны: они есть в футере, и дублировать
 * их рядом с единственным целевым действием значило уводить от него. Server-компонент (интерактива нет).
 * intro — приглашение (из Sanity bookingIntro, иначе дефолт).
 */
export function Booking({ intro }: { intro?: string } = {}) {
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
          {/* ЛЕВО: приглашение и шаги */}
          <Reveal className="flex flex-col">
            <p className="text-muted max-w-prose text-lg leading-relaxed sm:text-xl">
              {intro ??
                "Напишите мне в Telegram — отвечу лично и помогу выбрать формат работы. Без обязательств: сначала обсудим задачу."}
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
          </Reveal>

          {/* ПРАВО: карточка с кнопкой в Telegram (вместо формы) */}
          <Reveal delay={80}>
            <div className="border-foreground/10 flex h-full flex-col justify-center gap-6 border-2 p-8 text-center sm:p-12">
              <p className="heading-upper text-foreground text-2xl font-bold sm:text-3xl">
                Записаться на консультацию
              </p>
              <p className="text-muted mx-auto max-w-prose text-base leading-relaxed sm:text-lg">
                Все заявки — в Telegram. Напишите мне в чат: расскажите о
                задаче, и я отвечу лично.
              </p>
              <a
                href={CTA.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill mx-auto mt-2 inline-flex w-fit px-8 py-4 text-base font-medium"
              >
                {CTA.label} в Telegram
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
