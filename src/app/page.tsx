export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-gray text-sm tracking-widest uppercase">
        Holod_lending · этап 0
      </p>

      <h1 className="heading-upper text-foreground mt-6 text-6xl font-black sm:text-8xl">
        lina H.
      </h1>

      <p className="text-muted mt-6 max-w-md text-balance">
        Проект инициализирован. Дизайн-токены, шрифт Inter и базовая структура
        готовы — можно приступать к вёрстке секций по макету.
      </p>

      <a href="#" className="btn-pill mt-10 px-6 py-3 text-sm font-medium">
        Записаться
      </a>
    </main>
  );
}
