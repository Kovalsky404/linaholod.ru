import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificateShop } from "./CertificateShop";

/**
 * Страница сертификата: выбор дизайна и суммы → «Купить сертификат»
 * раскрывает Telegram и почту с готовым сообщением.
 *
 * Главное обещание — менеджер получает ВЫБРАННЫЕ сумму и дизайн. Поэтому
 * проверяем не наличие кнопок, а текст внутри ссылки: перепутанная проводка
 * состояния дала бы рабочую на вид кнопку с неверной суммой.
 */

/** Текст сообщения из ссылки t.me/...?text= */
function telegramText(link: HTMLElement): string {
  const url = new URL(link.getAttribute("href")!);
  expect(url.origin + url.pathname).toBe("https://t.me/holod_styling");
  return url.searchParams.get("text") ?? "";
}

const buyButton = () =>
  screen.getByRole("button", { name: "Купить сертификат" });
const telegramLink = () => screen.getByRole("link", { name: /В Telegram/ });
const customInput = () => screen.getByRole("textbox", { name: /Своя сумма/ });
/** Имя радио номинала: разряды и «₽» — через неразрывный пробел, как на экране
 *  (поиск по роли сравнивает имя без нормализации пробелов). */
const NBSP = "\u00A0";
const amount = (n: string) => `${n.replace(" ", NBSP)}${NBSP}₽`;

/**
 * Свёрнут ли блок способов связи. jsdom-запросы не учитывают inert, поэтому
 * смотрим сам атрибут: именно он убирает ссылки из Tab и a11y-дерева.
 */
function optionsCollapsed(): boolean {
  const region = document.getElementById(
    buyButton().getAttribute("aria-controls")!,
  )!;
  return (
    region.hasAttribute("inert") &&
    buyButton().getAttribute("aria-expanded") === "false"
  );
}

describe("CertificateShop · покупка", () => {
  it("1. по умолчанию: дизайн «Небо», 10 000 ₽, способы связи скрыты", () => {
    render(<CertificateShop />);
    expect(screen.getByRole("radio", { name: "Небо" })).toBeChecked();
    expect(screen.getByRole("radio", { name: amount("10 000") })).toBeChecked();
    expect(optionsCollapsed()).toBe(true);
  });

  it("2. «Купить» раскрывает Telegram с суммой и дизайном в сообщении", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.click(buyButton());

    expect(optionsCollapsed()).toBe(false);
    const text = telegramText(telegramLink());
    expect(text).toContain("10\u00A0000 ₽");
    expect(text).toContain("«Небо»");
    expect(telegramLink()).toHaveAttribute("target", "_blank");
  });

  it("3. смена дизайна и номинала после раскрытия обновляет сообщение", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.click(buyButton());
    await user.click(screen.getByRole("radio", { name: "Лес" }));
    await user.click(screen.getByRole("radio", { name: amount("25 000") }));

    const text = telegramText(telegramLink());
    expect(text).toContain("25\u00A0000 ₽");
    expect(text).toContain("«Лес»");
    expect(text).not.toContain("Небо");
  });

  it("4. своя сумма в пределах — снимает готовый номинал и идёт в сообщение", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.type(customInput(), "7500");
    expect(customInput()).toHaveValue("7\u00A0500");
    expect(
      screen.getByRole("radio", { name: amount("10 000") }),
    ).not.toBeChecked();

    await user.click(buyButton());
    expect(telegramText(telegramLink())).toContain("7\u00A0500 ₽");
  });

  it("4b. Backspace стирает последнюю цифру (знак ₽ не часть значения)", async () => {
    // Регресс-лок: когда «₽» был частью значения, Backspace стирал его,
    // форматирование возвращало обратно — и удалить цифру было нельзя.
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.type(customInput(), "7500{Backspace}");
    expect(customInput()).toHaveValue("750");
  });

  it("5. сумма вне 500–500 000 — ошибка, способы связи не раскрываются", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);

    await user.type(customInput(), "300");
    expect(screen.getByRole("alert")).toHaveTextContent("от 500 до 500 000");
    expect(customInput()).toHaveAttribute("aria-invalid", "true");
    await user.click(buyButton());
    expect(optionsCollapsed()).toBe(true);

    await user.clear(customInput());
    await user.type(customInput(), "600000");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Граница включительно.
    await user.clear(customInput());
    await user.type(customInput(), "500000");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(buyButton());
    expect(telegramText(telegramLink())).toContain("500\u00A0000 ₽");
  });

  it("6. стёрли свою сумму и жмут «Купить» — просьба выбрать номинал", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.type(customInput(), "5");
    await user.clear(customInput());
    await user.click(buyButton());
    expect(screen.getByRole("alert")).toHaveTextContent("Выберите номинал");
    expect(optionsCollapsed()).toBe(true);
  });
});

describe("CertificateShop · почта", () => {
  it("7. без почты кнопки «По почте» нет — ссылки в никуда не показываем", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.click(buyButton());
    expect(optionsCollapsed()).toBe(false);
    expect(
      screen.queryByRole("link", { name: /По почте/ }),
    ).not.toBeInTheDocument();
  });

  it("8. с почтой — mailto с темой и тем же сообщением", async () => {
    const user = userEvent.setup();
    render(<CertificateShop email="hello@example.ru" />);
    await user.click(screen.getByRole("radio", { name: "Пудра" }));
    await user.click(buyButton());

    const href = screen
      .getByRole("link", { name: /По почте/ })
      .getAttribute("href")!;
    expect(href.startsWith("mailto:hello@example.ru?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("subject")).toBe("Подарочный сертификат lina H.");
    expect(params.get("body")).toContain("«Пудра»");
    expect(params.get("body")).toContain("10\u00A0000 ₽");
  });
});

describe("CertificateShop · условия", () => {
  it("9. «Условия использования» открывают панель с пунктами клиента", async () => {
    const user = userEvent.setup();
    render(<CertificateShop />);
    await user.click(
      screen.getByRole("button", { name: "Условия использования" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Условия использования",
    });
    const items = within(dialog).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Срок действия сертификата — 1 год.");
    expect(dialog).toHaveTextContent("от 500 до 500 000 рублей");
    expect(dialog).toHaveTextContent("отправлен в СМС");
    expect(dialog).toHaveTextContent("разделить на несколько покупок");
    // Возврат — через менеджера, а не «в розничном магазине».
    expect(items.at(-1)).toHaveTextContent("напишите менеджеру в Telegram");
    expect(dialog).not.toHaveTextContent(/магазин/i);

    await user.click(
      within(dialog).getAllByRole("button", { name: "Закрыть" })[0]!,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("10. с почтой пункт о возврате называет и почту", async () => {
    const user = userEvent.setup();
    render(<CertificateShop email="hello@example.ru" />);
    await user.click(
      screen.getByRole("button", { name: "Условия использования" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("link", { name: "hello@example.ru" }),
    ).toHaveAttribute("href", "mailto:hello@example.ru");
  });
});
