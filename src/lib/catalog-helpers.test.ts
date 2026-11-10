// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  certificateRequest,
  CERTIFICATE_DESIGNS,
  formatRub,
  isValidAmount,
} from "./certificates";
import {
  itemsCount,
  pickShowcase,
  rentalRequest,
  splitPrice,
  toLines,
  toParagraphs,
} from "./rent";
import { mailMessage, telegramMessage } from "./site-config";

/** Чистые хелперы сертификатов, аренды и ссылок с готовым текстом. */

describe("formatRub / isValidAmount", () => {
  it("разряды через неразрывный пробел (одинаково на сервере и в браузере)", () => {
    expect(formatRub(500)).toBe("500");
    expect(formatRub(10000)).toBe("10\u00A0000");
    expect(formatRub(500000)).toBe("500\u00A0000");
    expect(formatRub(1234567)).toBe("1\u00A0234\u00A0567");
  });

  it("границы 500 и 500 000 включительно, мимо — нет", () => {
    expect(isValidAmount(500)).toBe(true);
    expect(isValidAmount(500000)).toBe(true);
    expect(isValidAmount(499)).toBe(false);
    expect(isValidAmount(500001)).toBe(false);
    expect(isValidAmount(null)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
  });

  it("сообщение менеджеру называет сумму и дизайн", () => {
    const design = CERTIFICATE_DESIGNS[0]!;
    const text = certificateRequest(15000, design);
    expect(text).toContain("15\u00A0000 ₽");
    expect(text).toContain(`«${design.name}»`);
  });

  it("пять дизайнов с уникальными id и именами", () => {
    expect(CERTIFICATE_DESIGNS).toHaveLength(5);
    expect(new Set(CERTIFICATE_DESIGNS.map((d) => d.id)).size).toBe(5);
    expect(new Set(CERTIFICATE_DESIGNS.map((d) => d.name)).size).toBe(5);
  });
});

describe("ссылки с готовым текстом", () => {
  it("telegramMessage кодирует текст целиком (кириллица, кавычки, перенос)", () => {
    const href = telegramMessage("Привет «мир»\nhttps://x.y/?a=1&b=2");
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://t.me/holod_styling");
    // & внутри текста не должен порвать параметр на два.
    expect(url.searchParams.get("text")).toBe(
      "Привет «мир»\nhttps://x.y/?a=1&b=2",
    );
    expect([...url.searchParams.keys()]).toEqual(["text"]);
  });

  it("mailMessage: тема и тело раздельно, & не рвёт параметры", () => {
    const href = mailMessage("a@b.ru", "Тема & ещё", "Тело");
    expect(href.startsWith("mailto:a@b.ru?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("subject")).toBe("Тема & ещё");
    expect(params.get("body")).toBe("Тело");
  });
});

describe("аренда: тексты", () => {
  it("rentalRequest: с постом — ссылка отдельной строкой; без — только название", () => {
    expect(
      rentalRequest("Платье", "https://instagram.com/p/1/").split("\n"),
    ).toEqual([
      "Здравствуйте! Хочу забронировать «Платье» из каталога аренды.",
      "https://instagram.com/p/1/",
      "Дата аренды: ",
      "Время получения и возврата: ",
    ]);
    // Без поста — те же строки, только без ссылки (а не пустая строка на её месте).
    expect(rentalRequest("Платье").split("\n")).toEqual([
      "Здравствуйте! Хочу забронировать «Платье» из каталога аренды.",
      "Дата аренды: ",
      "Время получения и возврата: ",
    ]);
  });

  it("itemsCount склоняет: 1 вещь, 2 вещи, 5 вещей, 11–14 вещей, 21 вещь", () => {
    expect(itemsCount(1)).toBe("1 вещь");
    expect(itemsCount(2)).toBe("2 вещи");
    expect(itemsCount(4)).toBe("4 вещи");
    expect(itemsCount(5)).toBe("5 вещей");
    expect(itemsCount(11)).toBe("11 вещей");
    expect(itemsCount(12)).toBe("12 вещей");
    expect(itemsCount(14)).toBe("14 вещей");
    expect(itemsCount(21)).toBe("21 вещь");
    expect(itemsCount(22)).toBe("22 вещи");
    expect(itemsCount(0)).toBe("0 вещей");
  });

  it("toLines снимает маркеры «•», «-», «—» и пустые строки", () => {
    expect(toLines("• Раз\n\n- Два\n— Три\n  Четыре  ")).toEqual([
      "Раз",
      "Два",
      "Три",
      "Четыре",
    ]);
  });

  it("toParagraphs режет по пустой строке", () => {
    expect(toParagraphs("А\nБ\n\n\nВ")).toEqual(["А\nБ", "В"]);
  });
});

describe("аренда: цена и витрина", () => {
  it("splitPrice делит сумму, единицу и примечание", () => {
    expect(splitPrice("1 600 ₽ / сутки, по отдельности — 800 ₽")).toEqual({
      amount: "1 600 ₽",
      unit: "/ сутки",
      note: "по отдельности — 800 ₽",
    });
    expect(splitPrice("500 ₽ / сутки")).toEqual({
      amount: "500 ₽",
      unit: "/ сутки",
    });
    // Свободный текст без «/» и запятой — целиком суммой, ничего не теряется.
    expect(splitPrice("по запросу")).toEqual({ amount: "по запросу" });
  });

  it("pickShowcase: одежда важнее аксессуаров, главная вещь — в центре веера", () => {
    const items = [
      { id: "belt", category: "Аксессуары" },
      { id: "vest", category: "Верх" },
      { id: "shorts", category: "Низ" },
      { id: "set", category: "Костюмы" },
    ];
    // Первая по значимости (vest) — в середину, слева вторая, справа третья.
    expect(pickShowcase(items).map((i) => i.id)).toEqual([
      "shorts",
      "vest",
      "set",
    ]);
    // Одежды мало — добираем аксессуарами, пустых мест нет.
    expect(
      pickShowcase([{ id: "a", category: "Аксессуары" }, { id: "b" }]).map(
        (i) => i.id,
      ),
    ).toEqual(["a", "b"]);
    expect(pickShowcase([])).toEqual([]);
  });
});
