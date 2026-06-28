import Image from "next/image";
import type { ResolvedImage } from "@/sanity/types";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Контент «Почему я» из Sanity с фолбэками. */
type WhyMeContent = { title?: string; text?: string; image?: ResolvedImage };

const WHYME_FALLBACK_TEXT =
  "За плечами — профессиональное образование в стилизации и реальный опыт на коммерческих и творческих съёмках, поэтому я одинаково уверенно работаю и с частными клиентами, и с брендами. Слежу за актуальными трендами и рынком fashion-индустрии, но не навязываю их: для меня важнее ваш бюджет, ритм жизни и то, как вы себя в итоге чувствуете. Веду проект комплексно — от первой идеи до результата — и держу внимание на каждой детали, потому что именно в них всё и решается.";

/**
 * Секция «Почему я?».
 *
 * Заголовок + текст слева, крупное фото справа (920:896). Контент из Sanity
 * (siteSettings.whyMe*) с фолбэком на дефолты. Мобайл: заголовок → фото → текст.
 */
export function WhyMe({ content }: { content?: WhyMeContent } = {}) {
  const title = content?.title || "Почему я?";
  const text = content?.text || WHYME_FALLBACK_TEXT;
  const image = content?.image ?? {
    src: "/images/placeholder.svg",
    unoptimized: true,
  };
  return (
    <section
      id="why"
      className="scroll-mt-20 pb-20 sm:pb-28"
      aria-labelledby="why-heading"
    >
      <div className="container-site border-foreground/10 border-t pt-20 sm:pt-28">
        <Reveal>
          <SectionHeading id="why-heading">{title}</SectionHeading>
        </Reveal>

        <div className="mt-10 grid items-center gap-10 lg:mt-16 lg:grid-cols-[11fr_9fr] lg:gap-16">
          {/* Текстовый блок — слева */}
          <Reveal delay={80} className="order-2 lg:order-1">
            <p
              className="text-muted max-w-[42ch] leading-[1.23] whitespace-pre-line"
              style={{ fontSize: "clamp(1.125rem,1.7vw,1.75rem)" }}
            >
              {text}
            </p>
          </Reveal>

          {/* Фото — справа, 920:896. */}
          <Reveal delay={120} className="order-1 lg:order-2">
            <div className="bg-placeholder relative aspect-[920/896] w-full overflow-hidden lg:ml-auto">
              <Image
                src={image.src}
                alt="Лина Холод — персональный стилист"
                fill
                loading="lazy"
                unoptimized={image.unoptimized}
                sizes="(max-width: 1024px) 92vw, 41vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
