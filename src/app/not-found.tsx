import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

/**
 * 404 — в стилистике макета: крупный UPPERCASE-заголовок, монохром,
 * pill-кнопка «На главную».
 */
export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p
        className="heading-upper text-foreground font-black"
        style={{ fontSize: "var(--text-display)" }}
      >
        404
      </p>
      <h1 className="heading-upper text-foreground mt-4 text-2xl font-bold sm:text-3xl">
        Страница не найдена
      </h1>
      <p className="text-muted mt-4 max-w-md text-balance">
        Похоже, такой страницы нет. Вернёмся к началу.
      </p>
      <Link href="/" className="btn-pill mt-8 px-8 py-4 text-base font-medium">
        На главную
      </Link>
    </section>
  );
}
