import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  gallery: ["https://cdn.x/imgA1-800x1000.jpg", "https://cdn.x/imgA2-800x1000.jpg"],
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

afterEach(() => {
  vi.restoreAllMocks();
});

const dialog = () => screen.getByRole("dialog");
const videoEl = () => dialog().querySelector("video");
const imgSrc = () => within(dialog()).getByRole("img").getAttribute("src");
const counterText = () => {
  // счётчик «N / M» — единственный узел такого вида в диалоге
  const node = within(dialog())
    .getAllByText(/^\s*\d+\s*\/\s*\d+\s*$/)
    .find((n) => n.getAttribute("aria-live") === "polite");
  return node?.textContent?.replace(/\s+/g, " ").trim();
};

async function openWork(user: ReturnType<typeof userEvent.setup>, title: string) {
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
    expect(videoEl()).toBeNull(); // видео сменилось картинкой
    expect(imgSrc()).toBe(withVideo.gallery[0]);
    expect(counterText()).toBe("2 / 3");
  });

  it("5. ArrowLeft/ArrowRight цикличны (0→last→0)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка с видео");

    await user.keyboard("{ArrowLeft}"); // 0 → last (индекс 2 = imgA2)
    expect(videoEl()).toBeNull();
    expect(imgSrc()).toBe(withVideo.gallery[1]);
    expect(counterText()).toBe("3 / 3");

    await user.keyboard("{ArrowRight}"); // last → 0 (видео)
    expect(videoEl()).not.toBeNull();
    expect(videoEl()!.getAttribute("src")).toBe(withVideo.video);
    expect(counterText()).toBe("1 / 3");
  });

  it("6. клики по половинам листают (паритет со стрелками)", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Съёмка без видео");

    await user.click(
      within(dialog()).getByRole("button", { name: "Следующее фото" }),
    );
    expect(imgSrc()).toBe(noVideo.gallery[1]);
    expect(counterText()).toBe("2 / 3");

    await user.click(
      within(dialog()).getByRole("button", { name: "Предыдущее фото" }),
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
  it("11. один слайд → нет кнопок листания, стрелка no-op", async () => {
    const user = userEvent.setup();
    render(<Portfolio items={items} />);
    await openWork(user, "Одиночная");

    expect(
      within(dialog()).queryByRole("button", { name: "Следующее фото" }),
    ).toBeNull();
    expect(counterText()).toBe("1 / 1");
    await user.keyboard("{ArrowRight}");
    expect(counterText()).toBe("1 / 1");
    expect(imgSrc()).toBe(single.gallery[0]);
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
