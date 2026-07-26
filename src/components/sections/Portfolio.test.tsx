import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Portfolio } from "./Portfolio";
import type { PortfolioView } from "@/sanity/types";

/**
 * F7 — быстрый просмотр портфолио (RTL, jsdom).
 * Данные приходят пропсами (без сети). Проверяем то, что видит пользователь:
 * открытие ПРАВИЛЬНОЙ работы, слайды [видео?, ...галерея], листание (стрелки/
 * половины) с реальной сменой медиа, счётчик, закрытие, сброс индекса.
 *
 * Важно: у next/image при unoptimized src отдаётся «как есть» → сравниваем URL.
 * Видео — реальный <video> (без role), берём через dialog.querySelector.
 */

// Работы под индексами 1 и 2 (не 0) — чтобы доказывать, что открылась нужная.
const single: PortfolioView = {
  id: "c",
  number: "#1",
  title: "Одиночная",
  shoot: "Shoot C",
  description: "Описание C",
  date: "Январь 2026",
  cover: "https://cdn.x/coverC-450x487.jpg",
  gallery: ["https://cdn.x/imgC1-800x1000.jpg"],
  unoptimized: true,
};
const withVideo: PortfolioView = {
  id: "a",
  number: "#2",
  title: "Съёмка с видео",
  shoot: "Shoot A",
  description: "Описание A",
  date: "Февраль 2026",
  cover: "https://cdn.x/coverA-450x487.jpg",
  gallery: [
    "https://cdn.x/imgA1-800x1000.jpg",
    "https://cdn.x/imgA2-800x1000.jpg",
  ],
  video: "https://cdn.x/clipA-1920x1080.mp4",
  unoptimized: true,
};
const noVideo: PortfolioView = {
  id: "b",
  number: "#3",
  title: "Съёмка без видео",
  shoot: "Shoot B",
  description: "Описание B",
  date: "Март 2026",
  cover: "https://cdn.x/coverB-450x487.jpg",
  gallery: [
    "https://cdn.x/imgB1-800x1000.jpg",
    "https://cdn.x/imgB2-800x1000.jpg",
    "https://cdn.x/imgB3-800x1000.jpg",
  ],
  unoptimized: true,
};
const items = [single, withVideo, noVideo];

// jsdom не реализует play()/pause() — без заглушек он печатает «Not implemented»
// на каждый рендер видео. Заодно даёт возможность проверить, что пауза реально
// вызывается (иначе это поведение не покрыто ничем: E2E-видео не декодируется).
let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  playSpy = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(() => Promise.resolve());
  pauseSpy = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});
});

afterEach(() => {
  // Размонтируем ДО снятия шпионов: эффект паузы срабатывает на unmount, и с
  // уже восстановленным HTMLMediaElement.pause jsdom сыпал бы «Not implemented»
  // в вывод тестов. Авто-cleanup от RTL после этого — no-op.
  cleanup();
  vi.restoreAllMocks();
});

const dialog = () => screen.getByRole("dialog");
const videoEl = () => dialog().querySelector("video");
/**
 * Является ли видео АКТИВНЫМ слайдом. Соседние слайды намеренно остаются в DOM
 * (предзагрузка + crossfade), поэтому «видео в DOM» больше не значит «видно»;
 * активность видна по aria-hidden на обёртке слайда.
 */
const videoIsActive = () => {
  const v = videoEl();
  // Явная ошибка вместо тихого false: иначе «видео отсутствует» и «видео
  // неактивно» были бы неразличимы, и проверка проходила бы при пропаже видео.
  if (!v)
    throw new Error("В диалоге нет <video> — проверять активность нечего");
  return v.closest("[aria-hidden]")?.getAttribute("aria-hidden") === "false";
};
/** src активного кадра: getByRole("img") не видит соседей (aria-hidden + alt=""). */
const imgSrc = () => within(dialog()).getByRole("img").getAttribute("src");
/** Сколько слайдов реально смонтировано (окно предзагрузки). */
const mountedMedia = () => dialog().querySelectorAll("img, video").length;
const counterText = () => {
  // счётчик «N / M» — единственный узел такого вида в диалоге. queryAllByText,
  // а не getAllByText: при единственном слайде счётчика нет вовсе, и версия с
  // get* бросала бы исключение вместо честного undefined.
  const node = within(dialog())
    .queryAllByText(/^\s*\d+\s*\/\s*\d+\s*$/)
    .find((n) => n.getAttribute("aria-live") === "polite");
  return node?.textContent?.replace(/\s+/g, " ").trim();
};

async function openWork(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(`Открыть работу: ${title}`),
    }),
  );
  return screen.findByRole("dialog", {
    name: new RegExp(`${title} — портфолио`),
  });
}

// ───────────────────── Открытие правильной работы ─────────────────────
describe("F7 · открытие", () => {
  it("1. клик по карточке открывает ИМЕННО эту работу (не item 0)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    const d = dialog();
    expect(within(d).getByText("#2")).toBeInTheDocument();
    expect(within(d).getByText("Съёмка с видео")).toBeInTheDocument();
    expect(within(d).getByText("Shoot A")).toBeInTheDocument();
    expect(within(d).getByText("Описание A")).toBeInTheDocument();
    expect(within(d).getByText("Февраль 2026")).toBeInTheDocument();
    // не открылась «Одиночная» (item 0)
    expect(within(d).queryByText("Одиночная")).not.toBeInTheDocument();
  });
});

// ───────────────────── Подпись карточки (состав работы) ─────────────────────
describe("F7 · aria-label карточки описывает состав", () => {
  it("1b. видео-работа без галереи → «видео», а НЕ «0 фото»", () => {
    const videoOnly: PortfolioView = {
      ...withVideo,
      id: "vo",
      title: "Только видео",
      gallery: [],
    };
    render(<Portfolio items={[videoOnly]} />);
    const card = screen.getByRole("button", {
      name: /Открыть работу: Только видео/,
    });
    // Регресс-лок: счёт по gallery.length объявлял бы непустую работу пустой.
    expect(card.getAttribute("aria-label")).toBe(
      "Открыть работу: Только видео (видео)",
    );
  });

  it("1c. видео + фото → перечислены оба", () => {
    render(<Portfolio items={[withVideo]} />);
    const card = screen.getByRole("button", {
      name: /Открыть работу: Съёмка с видео/,
    });
    expect(card.getAttribute("aria-label")).toBe(
      "Открыть работу: Съёмка с видео (видео и 2 фото)",
    );
  });

  it("1d. работа без видео → только счёт фото", () => {
    render(<Portfolio items={[noVideo]} />);
    const card = screen.getByRole("button", {
      name: /Открыть работу: Съёмка без видео/,
    });
    expect(card.getAttribute("aria-label")).toBe(
      "Открыть работу: Съёмка без видео (3 фото)",
    );
  });
});

// ───────────────────── Слайды: видео-первый / картинка-первый ─────────────────────
describe("F7 · первый слайд и счётчик", () => {
  it("2. работа с видео → первый слайд <video>, счётчик 1/(галерея+1)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    expect(videoEl()).not.toBeNull();
    expect(videoEl()!.getAttribute("src")).toBe(withVideo.video);
    expect(within(dialog()).queryByRole("img")).toBeNull(); // медиа — видео, не img
    expect(counterText()).toBe("1 / 3"); // 2 фото + видео
  });

  it("3. работа без видео → первый слайд картинка gallery[0], счётчик 1/len", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");

    expect(videoEl()).toBeNull();
    expect(imgSrc()).toBe(noVideo.gallery[0]);
    expect(counterText()).toBe("1 / 3");
  });
});

// ───────────────────── Навигация: реальная смена медиа ─────────────────────
describe("F7 · навигация (медиа реально меняется)", () => {
  it("4. ArrowRight: видео → картинка, счётчик 2/3", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    await user.keyboard("{ArrowRight}");
    expect(videoIsActive()).toBe(false); // видео больше не активный слайд
    expect(imgSrc()).toBe(withVideo.gallery[0]);
    expect(counterText()).toBe("2 / 3");
  });

  it("5. ArrowLeft/ArrowRight цикличны (0→last→0)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    await user.keyboard("{ArrowLeft}"); // 0 → last (индекс 2 = imgA2)
    expect(videoIsActive()).toBe(false);
    expect(imgSrc()).toBe(withVideo.gallery[1]);
    expect(counterText()).toBe("3 / 3");

    await user.keyboard("{ArrowRight}"); // last → 0 (видео)
    expect(videoIsActive()).toBe(true);
    expect(videoEl()!.getAttribute("src")).toBe(withVideo.video);
    expect(counterText()).toBe("1 / 3");
  });

  it("5b. соседние кадры ПРЕДЗАГРУЖЕНЫ (в DOM), но скрыты от скринридера", async () => {
    // Смысл окна: к моменту клика сосед уже загружен → нет ожидания, и оба
    // кадра существуют одновременно → возможен crossfade.
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео"); // 3 кадра, старт на 0

    // смонтированы кадр 0 (активный) + соседи 1 и 2 (циклично)
    expect(mountedMedia()).toBe(3);
    const preloaded = Array.from(dialog().querySelectorAll("img")).map((i) =>
      i.getAttribute("src"),
    );
    expect(new Set(preloaded)).toEqual(new Set(noVideo.gallery));

    // активный ровно один — остальные aria-hidden и потому вне ролей
    expect(within(dialog()).getAllByRole("img")).toHaveLength(1);
    expect(imgSrc()).toBe(noVideo.gallery[0]);
  });

  it("5b2. одинаковые URL в галерее не схлопываются в один слайд", async () => {
    // Реальный риск: статический фолбэк (src/lib/portfolio.ts) отдаёт 12
    // ОДИНАКОВЫХ URL плейсхолдера. При key={slide.src} React считал бы их одним
    // элементом — часть кадров пропадала бы, а счётчик показывал прежнее число.
    const dupes: PortfolioView = {
      ...noVideo,
      id: "dupes",
      title: "Повторы",
      gallery: [
        "https://cdn.x/same-800x1000.jpg",
        "https://cdn.x/same-800x1000.jpg",
        "https://cdn.x/same-800x1000.jpg",
      ],
    };
    // Ловим ИМЕННО коллизию ключей: React сообщает о ней через console.error, а
    // видимое поведение при одинаковых картинках не отличается — проверки
    // счётчика и числа элементов проходили бы и со сломанным key.
    // Не глушим console.error целиком: перехватываем только предупреждение о
    // ключах, всё остальное (act-warning, ошибки пропов) пробрасываем дальше —
    // иначе настоящая поломка React внутри этого теста осталась бы незаметной.
    const errors: string[] = [];
    const isKeyWarning = (s: string) =>
      /two children with the same key|same key/i.test(s);
    const original = console.error;
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const text = args.map(String).join(" ");
      if (isKeyWarning(text)) errors.push(text);
      else original(...args);
    });

    const user = userEvent.setup();
    render(<Portfolio items={[dupes]} />);
    await openWork(user, "Повторы");

    expect(counterText()).toBe("1 / 3");
    expect(mountedMedia()).toBe(3); // три отдельных элемента, а не один
    await user.keyboard("{ArrowRight}");
    expect(counterText()).toBe("2 / 3");

    // mockRestore не зовём: afterEach → vi.restoreAllMocks() снимет шпиона даже
    // если проверка ниже упадёт.
    expect(errors, `React пожаловался на ключи: ${errors[0]}`).toEqual([]);
  });

  it("5b3. sizes рассчитывается по пропорции кадра, а не фиксированным vw", async () => {
    // Колонка с медиа на md+ — это h-[85vh] w-auto, её ширина равна
    // 85vh × (W/H) кадра и НЕ зависит от ширины окна. Фиксированный vw поэтому
    // всегда врёт: 40vw недозапрашивал (картинка растягивалась), 60vw
    // перезапрашивал. Здесь фиксируем именно формулу.
    // unoptimized: false — иначе next/image не рендерит sizes вовсе (без srcset
    // атрибут не нужен), и проверять было бы нечего. Реальные фото из Sanity
    // идут именно этим путём.
    const mixed: PortfolioView = {
      ...noVideo,
      id: "mx",
      title: "Разные пропорции",
      unoptimized: false,
      gallery: [
        "https://cdn.x/portrait-800x1000.jpg", // 0.8
        "https://cdn.x/landscape-3000x2000.jpg", // 1.5
        "https://cdn.x/no-dimensions.jpg", // фолбэк 1.5
      ],
    };
    const user = userEvent.setup();
    render(<Portfolio items={[mixed]} />);
    await openWork(user, "Разные пропорции");

    // При оптимизации src превращается в /_next/image?url=<кодированный>…,
    // поэтому исходный кадр ищем по закодированному URL внутри src.
    const sizesOf = (src: string) =>
      Array.from(dialog().querySelectorAll("img"))
        .find((i) =>
          (i.getAttribute("src") ?? "").includes(encodeURIComponent(src)),
        )
        ?.getAttribute("sizes");

    // Проверяем суть — расчёт по пропорции кадра. Мобильную часть строки не
    // пришпиливаем: её правка не должна ронять три теста про пропорции.
    expect(sizesOf(mixed.gallery[0]!)).toMatch(/calc\(85vh \* 0\.800\)$/);
    expect(sizesOf(mixed.gallery[1]!)).toMatch(/calc\(85vh \* 1\.500\)$/);
    // URL без размеров в имени → безопасный фолбэк 3/2, а не NaN.
    expect(sizesOf(mixed.gallery[2]!)).toMatch(/calc\(85vh \* 1\.500\)$/);
  });

  it("5c. окно ограничено: далёкие кадры НЕ монтируются", async () => {
    // 5 кадров → в DOM максимум 3 (текущий + два соседа), а не вся галерея.
    const many: PortfolioView = {
      ...noVideo,
      id: "many",
      title: "Много кадров",
      gallery: [
        "https://cdn.x/m1-800x1000.jpg",
        "https://cdn.x/m2-800x1000.jpg",
        "https://cdn.x/m3-800x1000.jpg",
        "https://cdn.x/m4-800x1000.jpg",
        "https://cdn.x/m5-800x1000.jpg",
      ],
    };
    const user = userEvent.setup();
    render(<Portfolio items={[many]} />);
    await openWork(user, "Много кадров");

    expect(mountedMedia()).toBe(3);
    expect(counterText()).toBe("1 / 5");
  });

  it("6. клики по половинам листают (паритет со стрелками)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");

    await user.click(
      within(dialog()).getByRole("button", { name: "Следующий кадр" }),
    );
    expect(imgSrc()).toBe(noVideo.gallery[1]);
    expect(counterText()).toBe("2 / 3");

    await user.click(
      within(dialog()).getByRole("button", { name: "Предыдущий кадр" }),
    );
    expect(imgSrc()).toBe(noVideo.gallery[0]);
    expect(counterText()).toBe("1 / 3");
  });
});

// ───────────────────── Закрытие и фокус ─────────────────────
describe("F7 · закрытие", () => {
  it("7. Escape закрывает", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("8. кнопка «Закрыть» закрывает", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    await user.click(within(dialog()).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("9. клик по внешнему контейнеру (оверлей) закрывает", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    // обработчик onMouseDown на внешнем контейнере закрывает при target===currentTarget
    fireEvent.mouseDown(dialog().parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("10. после закрытия фокус возвращается на карточку", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    const card = screen.getByRole("button", {
      name: /Открыть работу: Съёмка без видео/,
    });
    await user.click(card);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(card).toHaveFocus();
  });
});

// ───────────────────── Края и сброс состояния ─────────────────────
describe("F7 · края и сброс индекса", () => {
  it("10b. видео без галереи → ровно один слайд, обложка не дублируется", async () => {
    const videoOnly: PortfolioView = {
      ...withVideo,
      id: "vo",
      title: "Только видео",
      gallery: [], // галерея пуста — обложка НЕ подставляется (см. content.ts)
    };
    const user = userEvent.setup();
    render(<Portfolio items={[videoOnly]} />);
    await openWork(user, "Только видео");

    expect(counterText()).toBeUndefined(); // «1 / 1» не показываем — нечего считать
    expect(videoEl()).not.toBeNull();
    expect(within(dialog()).queryByRole("img")).toBeNull(); // нет кадра-обложки
    expect(
      within(dialog()).queryByRole("button", { name: "Следующий кадр" }),
    ).toBeNull();
  });

  it("11. один слайд → нет кнопок листания, стрелка no-op", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Одиночная");

    expect(
      within(dialog()).queryByRole("button", { name: "Следующий кадр" }),
    ).toBeNull();
    expect(counterText()).toBeUndefined(); // единственный слайд — счётчик скрыт
    await user.keyboard("{ArrowRight}");
    expect(imgSrc()).toBe(single.gallery[0]); // стрелка — no-op
  });

  it("12. смена работы сбрасывает индекс на 0 (нет залипшего слайда)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");
    await user.keyboard("{ArrowRight}"); // 2/3
    await user.keyboard("{ArrowRight}"); // 3/3
    expect(counterText()).toBe("3 / 3");
    await user.keyboard("{Escape}");

    await openWork(user, "Съёмка без видео");
    expect(counterText()).toBe("1 / 3"); // новый слайд 0
    expect(imgSrc()).toBe(noVideo.gallery[0]);
  });

  it("13. нет дублей диалога после повторного открытия", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    await user.keyboard("{Escape}");
    await openWork(user, "Съёмка с видео");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});

// ───────────────────── Модалка: фокус-трап / скролл / видео / CTA ─────────────────────
describe("F7 · гарантии модалки", () => {
  it("15. focus-trap: Shift+Tab с первого элемента уходит на последний", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    const closeBtn = within(dialog()).getByRole("button", { name: "Закрыть" });
    expect(closeBtn).toHaveFocus(); // автофокус на первый фокусируемый
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(closeBtn).not.toHaveFocus(); // трап увёл на последний (CTA)
    expect(
      within(dialog()).getByRole("link", { name: /Записаться/i }),
    ).toHaveFocus();
  });

  it("16. body scroll-lock при открытии, восстановление при закрытии", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    expect(document.body.style.overflow).toBe("");
    await openWork(user, "Съёмка без видео");
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("16b. АКТИВНОЕ видео остаётся в потоке (иначе контейнер схлопнется)", async () => {
    // Регресс-лок: в видео-режиме у контейнера нет aspect-ratio, высоту задаёт
    // само видео. Если сделать активную обёртку absolute, контейнер получит
    // высоту 0, и видео вылезет поверх текста (проявлялось на мобильном).
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    const wrapper = dialog().querySelector('[data-slide="video"]')!;
    expect(wrapper.getAttribute("data-active")).toBe("true");
    expect(wrapper.className).toContain("relative");
    expect(wrapper.className).not.toContain("absolute");

    // уходим с видео — теперь оно не должно влиять на раскладку
    await user.keyboard("{ArrowRight}");
    expect(wrapper.getAttribute("data-active")).toBe("false");
    expect(wrapper.className).toContain("absolute");
  });

  it("16c. видео ставится на ПАУЗУ, когда перестаёт быть активным слайдом", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео"); // слайд 0 — видео
    expect(playSpy).toHaveBeenCalled();

    pauseSpy.mockClear();
    await user.keyboard("{ArrowRight}"); // уходим на фото
    expect(pauseSpy).toHaveBeenCalled(); // иначе играло бы скрытым
  });

  it("16d. неактивное видео убрано из tab-порядка (inert + без controls)", async () => {
    // aria-hidden и opacity:0 фокус НЕ снимают: без inert пользователь клавиатуры
    // попадал бы табом на невидимое видео внутри aria-hidden.
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    const wrapper = dialog().querySelector('[data-slide="video"]')!;
    const video = wrapper.querySelector("video")!;
    expect(wrapper.hasAttribute("inert")).toBe(false); // активное — доступно
    expect(video.hasAttribute("controls")).toBe(true);

    await user.keyboard("{ArrowRight}"); // видео стало соседом
    expect(wrapper.hasAttribute("inert")).toBe(true);
    expect(video.getAttribute("tabindex")).toBe("-1");
    expect(video.hasAttribute("controls")).toBe(false);
  });

  it("16c2. видео ставится на паузу при ЗАКРЫТИИ модалки", async () => {
    // Отдельно от 16c (смена слайда): при закрытии <video> размонтируется и ref
    // обнуляется, поэтому пауза должна приходить из cleanup-функции эффекта.
    // Иначе отцепленный элемент продолжает играть и тянуть данные.
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");
    expect(playSpy).toHaveBeenCalled();

    pauseSpy.mockClear();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(pauseSpy).toHaveBeenCalled();
  });

  it("16f. стрелки НЕ листают слайды, когда фокус на плеере", async () => {
    // В плеере ←/→ — это перемотка. Раньше обработчик окна перехватывал их и
    // звал preventDefault, лишая пользователя штатного управления видео.
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");
    expect(counterText()).toBe("1 / 3");

    // Событие ОТ видео: обработчик должен его пропустить.
    fireEvent.keyDown(videoEl()!, { key: "ArrowRight", bubbles: true });
    expect(counterText()).toBe("1 / 3"); // слайд не сменился
    expect(videoIsActive()).toBe(true);

    // Контрольная проверка: то же событие не от плеера листает как обычно.
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counterText()).toBe("2 / 3");
  });

  it("16e. preload: auto у активного видео, none у соседнего", async () => {
    // Обе ветки preload — единственная причина отказа от autoPlay: соседний
    // слайд с autoPlay браузер тянул целиком (десятки МБ). E2E-проверка этого
    // всегда пропускается (в CMS нет работы «видео + фото»), поэтому ветки
    // фиксируем здесь, на синтетической работе с видео и галереей.
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");
    const video = dialog().querySelector("video")!;
    expect(video.getAttribute("preload")).toBe("auto");

    await user.keyboard("{ArrowRight}"); // видео стало соседом
    expect(video.getAttribute("preload")).toBe("none");
  });

  it("17. видео-слайд: controls/muted/loop включены", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");
    const v = videoEl() as HTMLVideoElement;
    expect(v.controls).toBe(true);
    expect(v.muted).toBe(true);
    expect(v.loop).toBe(true);
  });

  it("18. CTA в модалке закрывает её", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");
    await user.click(
      within(dialog()).getByRole("link", { name: /Записаться/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ───────────────────── Стрелки карусели (scope-out) ─────────────────────
describe("F7 · стрелки карусели", () => {
  it("14. стрелки карусели присутствуют (пиксельный скролл — в E2E)", () => {
    render(<Portfolio items={items} />);
    // в jsdom метрики скролла = 0 → обе кнопки disabled, scrollBy — no-op;
    // само перелистывание проверяется на уровне Playwright.
    expect(
      screen.getByRole("button", { name: "Предыдущие работы" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Следующие работы" }),
    ).toBeInTheDocument();
  });
});
