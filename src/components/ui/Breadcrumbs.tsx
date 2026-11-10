import Link from "next/link";

/**
 * Хлебные крошки подстраниц: «Главная / Раздел». Последний пункт — текущая
 * страница (aria-current), ссылкой не является.
 */
export function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Хлебные крошки" className="text-gray text-xs uppercase">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/"
            className="hover:text-foreground transition-colors duration-200 ease-out"
          >
            Главная
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}
