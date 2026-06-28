/**
 * Заголовок секции с мотивом скобок: «[ ЗАГОЛОВОК ]».
 *
 * Скобки [ ] — курсив, приглушённый цвет; сам текст — жирный UPPERCASE.
 * Семантика — h2 (на странице один h1 в About).
 * tone: "light" (по умолчанию, чёрный на белом) или "dark" (белый на чёрном —
 * для инверсной full-bleed секции «Отзывы»).
 */
type SectionHeadingProps = {
  children: string;
  /** id для aria-labelledby секции (напр. "portfolio-heading"). */
  id?: string;
  className?: string;
  tone?: "light" | "dark";
};

export function SectionHeading({
  children,
  id,
  className = "",
  tone = "light",
}: SectionHeadingProps) {
  const textClass = tone === "dark" ? "text-background" : "text-foreground";
  const bracketClass = tone === "dark" ? "text-background/40" : "text-gray";

  return (
    <h2
      id={id}
      className={`heading-upper ${textClass} font-bold ${className}`}
      style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
    >
      <span className={`${bracketClass} font-normal italic`} aria-hidden="true">
        [&nbsp;
      </span>
      {children}
      <span className={`${bracketClass} font-normal italic`} aria-hidden="true">
        &nbsp;]
      </span>
    </h2>
  );
}
