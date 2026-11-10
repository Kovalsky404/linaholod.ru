"use client";

import type { ComponentPropsWithoutRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Адрес секции главной с учётом текущей страницы.
 *
 * На главной якорь остаётся голым («#about») — переход внутри документа,
 * без перезагрузки, и сохраняет query-строку (utm из рекламы не теряется).
 * На других страницах («/rent», «/certificates») голый якорь искал бы секцию
 * там, где её нет, поэтому ведём на главную: «/#about».
 */
export function useSectionHref() {
  const onHome = usePathname() === "/";
  return (hash: `#${string}`) => (onHome ? hash : `/${hash}`);
}

/** Ссылка на секцию главной — для серверных компонентов (футер). */
export function SectionLink({
  hash,
  ...rest
}: { hash: `#${string}` } & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const toSection = useSectionHref();
  return <a href={toSection(hash)} {...rest} />;
}
