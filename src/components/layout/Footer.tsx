import { BRAND, CTA, NAV_LINKS, SOCIAL_LINKS } from "@/lib/site-config";
import { SocialIcon } from "@/components/ui/SocialIcon";

/** Переопределения ссылок соцсетей из Sanity (по ключу). */
type SocialOverrides = Partial<
  Record<"telegram" | "instagram" | "whatsapp", string>
>;

/**
 * Футер: панель меню + соцсети поверх гигантской надписи «lina H».
 * Ссылки соцсетей берутся из Sanity (siteSettings) с фолбэком на site-config.
 * id="contacts" — цель пункта меню «Контакты».
 */
export function Footer({ social }: { social?: SocialOverrides } = {}) {
  // Мерджим: ссылка из Sanity (если задана и не плейсхолдер) важнее дефолта.
  const socialLinks = SOCIAL_LINKS.map((s) => {
    const override = social?.[s.key];
    return override ? { ...s, href: override } : s;
  });
  return (
    <footer id="contacts" className="scroll-mt-20 pt-10" aria-label="Контакты">
      {/* Верхняя линия-разделитель (#737373, 3px) — на всю ширину экрана */}
      <div className="bg-gray h-[3px] w-full" />

      {/* Навигационная панель — в контейнере */}
      <div className="container-site">
        <nav
          aria-label="Навигация в подвале"
          className="flex flex-col gap-6 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-5"
        >
          {/* Разделы: на мобайле — столбцом, на десктопе — в строку */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            {NAV_LINKS.slice(0, 3).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-foreground/80 hover:text-foreground text-sm uppercase transition-colors duration-200 ease-out"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Справа: pill + соцсети (компактнее на мобайле) */}
          <div className="flex items-center gap-3 sm:ml-auto sm:gap-4">
            <a
              href={CTA.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill px-4 py-2 text-xs font-medium sm:px-5 sm:py-2.5 sm:text-sm"
            >
              {CTA.label}
            </a>
            <ul className="flex items-center gap-2 sm:gap-2.5">
              {socialLinks.map((social) => (
                <li key={social.key}>
                  <SocialIcon social={social} />
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Гигантская надпись «LINA H» — на всю ширину, по центру, вплотную
          к низу. Размер ~19vw (в макете 350px при 1860 ≈ 18.8vw), чёрный 20%.
          leading-[0.74] + overflow-hidden убирают зазор снизу под глифами. */}
      <div className="mt-10 flex w-full justify-center overflow-hidden">
        <p
          aria-hidden="true"
          className="heading-upper font-bold whitespace-nowrap text-black/20 select-none"
          style={{ fontSize: "clamp(3rem, 19vw, 22rem)", lineHeight: 0.74 }}
        >
          {BRAND.wordmark}
        </p>
      </div>
    </footer>
  );
}
