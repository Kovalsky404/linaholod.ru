import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";

/** Один фото-плейсхолдер (next/image, заглушка #D9D9D9). */
function PhotoPlaceholder({
  ratio,
  alt,
  className = "",
  sizes,
}: {
  ratio: string;
  alt: string;
  className?: string;
  sizes: string;
}) {
  return (
    <div
      className={`bg-placeholder relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src="/images/placeholder.svg"
        alt={alt}
        fill
        loading="lazy"
        unoptimized
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}

const SMALL_SIZES = "(max-width: 1024px) 45vw, 15vw";
const BIG_SIZES = "(max-width: 1024px) 92vw, 32vw";

/**
 * Секция «Обо мне» (узел Figma 19:48).
 *
 * Десктоп — три колонки внутри контейнера 1700px (ничего не вылезает):
 *   слева  — ДВЕ маленькие фото в ряд (верх) + гигантское STYLIST (низ),
 *            заходящее вправо на центральное фото (overflow без раздувания
 *            сетки: width:0 + min-content);
 *   центр  — ОДНО большое квадратное фото на всю высоту;
 *   справа — «ЛИНА ХОЛОД» + абзац (верх) + ДВЕ маленькие фото в ряд (низ).
 *
 * Мобайл (одна колонка): заголовок → STYLIST → текст → фото.
 *
 * <h1> страницы — «STYLIST».
 */
/** Текст «Обо мне» из Sanity с фолбэками. */
type AboutContent = { name?: string; text?: string };

const ABOUT_FALLBACK_TEXT = [
  "Меня зовут Лина, я стилист из Москвы. Окончила Self Made Studio и больше года работаю в индустрии моды и визуального контента — стилизация образов, подготовка съёмок, координация команды.",
  "Для меня стиль — это самовыражение, а не слепое следование трендам: всегда отталкиваюсь от личности клиента, его образа жизни и задач. Работаю в двух направлениях — персональный стиль и съёмочные проекты, от концепции до полной организации.",
].join("\n\n");

/** Разбивает текст на абзацы (по пустой строке) для аккуратного рендера. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function About({ content }: { content?: AboutContent } = {}) {
  const name = content?.name || "лина холод";
  const text = content?.text || ABOUT_FALLBACK_TEXT;
  const aboutParts = paragraphs(text);
  return (
    <section
      id="about"
      className="scroll-mt-20 overflow-x-clip py-20 sm:py-28"
      aria-labelledby="about-heading"
    >
      <div className="container-site">
        {/* Заголовок секции [ ОБО МНЕ ] — стилизованный p (не h2:
            на странице один h1 — STYLIST ниже). */}
        <Reveal
          as="p"
          className="heading-upper text-foreground font-bold"
          style={{ fontSize: "clamp(1.75rem,3.5vw,3rem)" }}
        >
          <span className="text-gray font-normal italic" aria-hidden="true">
            [&nbsp;
          </span>
          Обо мне
          <span className="text-gray font-normal italic" aria-hidden="true">
            &nbsp;]
          </span>
        </Reveal>

        {/* ───────────────────── ДЕСКТОП (lg+) ─────────────────────
            Три РАВНЫЕ колонки: боковое фото = половина центрального
            (одно маленькое = (колонка − gap)/2 ≈ центр/2). */}
        <div className="mt-10 hidden lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-x-10">
          {/* ── ЛЕВАЯ КОЛОНКА ── */}
          <div className="flex flex-col">
            {/* Две маленькие фото в ряд */}
            <Reveal delay={140} className="grid grid-cols-2 gap-5">
              <PhotoPlaceholder
                ratio="1/1"
                sizes={SMALL_SIZES}
                alt="Лина Холод — образ из работ, фото 1"
              />
              <PhotoPlaceholder
                ratio="1/1"
                sizes={SMALL_SIZES}
                alt="Лина Холод — образ из работ, фото 2"
              />
            </Reveal>

            {/* STYLIST — единое слово одной строкой (буквы не прыгают):
                «STYLI» чёрное, «ST» сплошное белое. Слово выходит из левой
                колонки вправо (w-0 + whitespace-nowrap, не раздувает сетку),
                так что «ST» ложится на серое центральное фото. z-10 — поверх. */}
            <Reveal className="pointer-events-none relative z-10 mt-auto w-0 pt-10">
              <h1
                id="about-heading"
                className="heading-upper font-black whitespace-nowrap"
                style={{ fontSize: "clamp(3.5rem,10.6vw,11.6rem)" }}
              >
                <span className="text-foreground">Styli</span>
                <span className="text-background">st</span>
              </h1>
            </Reveal>
          </div>

          {/* ── ЦЕНТР: одно большое квадратное фото ── */}
          <Reveal delay={120}>
            <PhotoPlaceholder
              ratio="1/1"
              sizes={BIG_SIZES}
              alt="Лина Холод — крупный образ"
            />
          </Reveal>

          {/* ── ПРАВАЯ КОЛОНКА ── */}
          <div className="flex flex-col">
            <Reveal delay={60}>
              <p
                className="heading-upper text-foreground font-semibold"
                style={{ fontSize: "clamp(1.75rem,3vw,3.5rem)" }}
              >
                {name}
              </p>
              <div className="text-muted mt-4 flex flex-col gap-2 text-[0.8125rem] leading-relaxed xl:text-sm">
                {aboutParts.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Reveal>

            {/* Две маленькие фото в ряд (низ) — компактный отступ от текста */}
            <Reveal delay={160} className="mt-8 grid grid-cols-2 gap-5">
              <PhotoPlaceholder
                ratio="1/1"
                sizes={SMALL_SIZES}
                alt="Лина Холод — деталь образа, фото 1"
              />
              <PhotoPlaceholder
                ratio="1/1"
                sizes={SMALL_SIZES}
                alt="Лина Холод — деталь образа, фото 2"
              />
            </Reveal>
          </div>
        </div>

        {/* ───────────────────── МОБАЙЛ (<lg) ─────────────────────
            Одна колонка: STYLIST → текст → центр-фото → пары фото. */}
        <div className="mt-10 flex flex-col gap-8 lg:hidden">
          {/* На мобайле — визуальный дубль STYLIST как <p> (единственный
              <h1> страницы остаётся в десктоп-блоке, в DOM присутствует). */}
          <Reveal>
            <p
              className="heading-upper font-black"
              style={{ fontSize: "clamp(3rem,18vw,7rem)" }}
            >
              {/* На мобайле фона-фото под текстом нет, поэтому «st» с обводкой
                  (сплошное белое было бы невидимым на белом фоне). */}
              <span className="text-foreground">Styli</span>
              <span className="text-background [-webkit-text-stroke:1.5px_var(--color-foreground)]">
                st
              </span>
            </p>
          </Reveal>

          <Reveal delay={60}>
            <p
              className="heading-upper text-foreground font-semibold"
              style={{ fontSize: "clamp(2rem,9vw,3rem)" }}
            >
              {name}
            </p>
            <div className="text-muted mt-4 flex flex-col gap-3 text-base leading-relaxed">
              {aboutParts.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <PhotoPlaceholder
              ratio="1/1"
              sizes="92vw"
              alt="Лина Холод — крупный образ"
            />
          </Reveal>

          <Reveal delay={160} className="grid grid-cols-2 gap-5">
            <PhotoPlaceholder
              ratio="1/1"
              sizes="45vw"
              alt="Лина Холод — образ из работ, фото 1"
            />
            <PhotoPlaceholder
              ratio="1/1"
              sizes="45vw"
              alt="Лина Холод — образ из работ, фото 2"
            />
            <PhotoPlaceholder
              ratio="1/1"
              sizes="45vw"
              alt="Лина Холод — деталь образа, фото 1"
            />
            <PhotoPlaceholder
              ratio="1/1"
              sizes="45vw"
              alt="Лина Холод — деталь образа, фото 2"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
