// @vitest-environment node
import { describe, it, expect } from "vitest";
import { escapeHtml, formatContact } from "./telegram";

/**
 * F3 — чистые строковые функции escapeHtml / formatContact.
 * Здесь ИСЧЕРПЫВАЮЩЕЕ покрытие веток (route в F1 проверяет только «проводку»).
 *
 * Правило набора: каждое утверждение formatContact — полный toBe всей строки
 * (<a …>…</a> или plain). Никаких toContain/substring/snapshot.
 *
 * Безопасность href: в ветках 1/2 href подставляет СЫРОЙ ${user}, а лейбл —
 * escapeHtml(user). Это безопасно ТОЛЬКО потому, что захват — класс \w
 * ([A-Za-z0-9_]): в нём нет " < > / пробела/&, поэтому ни выхода из атрибута,
 * ни инъекции тега. Если регэксп хендла когда-нибудь ослабят до символов вне
 * \w — сырой href="…${user}…" станет точкой инъекции, и тесты 13/16 надо
 * пересмотреть (провенанс сырого захвата зафиксирован в #13).
 */

describe("escapeHtml", () => {
  it("1. порядок: < → &lt; (а не &amp;lt;)", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });
  it("2. составной порядок: &< → &amp;&lt; (без двойного экранирования)", () => {
    expect(escapeHtml("&<")).toBe("&amp;&lt;");
  });
  it("3. & → &amp;", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });
  it("4. > → &gt;", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });
  it("5. смешанная строка", () => {
    expect(escapeHtml("a<b>&c")).toBe("a&lt;b&gt;&amp;c");
  });
  it("6. чистая строка без изменений", () => {
    expect(escapeHtml("durov")).toBe("durov");
  });
  it("7. пустая строка", () => {
    expect(escapeHtml("")).toBe("");
  });
  it("8. экранируются ТОЛЬКО &<> — кавычки/слэш/= проходят", () => {
    expect(escapeHtml("a\"b'c/d=")).toBe("a\"b'c/d=");
  });
  it("8b. глобальный флаг: НЕСКОЛЬКО & экранируются все", () => {
    // сторож /g у первой замены (без /g остались бы 2-й и 3-й &)
    expect(escapeHtml("a & b & c")).toBe("a &amp; b &amp; c");
  });
});

describe("formatContact · ветка 1 (t.me / telegram.me)", () => {
  it("9. t.me/durov", () => {
    expect(formatContact("t.me/durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("10. https://t.me/durov", () => {
    expect(formatContact("https://t.me/durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("11. http://t.me/durov", () => {
    expect(formatContact("http://t.me/durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("12. telegram.me/durov → хост нормализуется в t.me", () => {
    expect(formatContact("telegram.me/durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("13. T.ME/Durov — /i + СЫРОЙ захват (провенанс href)", () => {
    // href несёт неизменённый регистр 'Durov' → доказывает сырую подстановку
    expect(formatContact("T.ME/Durov")).toBe(
      '<a href="https://t.me/Durov">@Durov</a>',
    );
  });
  it("14. t.me/durov/photos?a=1 → \\w{3,} до '/', хвост отброшен", () => {
    expect(formatContact("t.me/durov/photos?a=1")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("14b. t.me/abc — нижняя граница \\w{3,} (ровно 3) матчится", () => {
    // pass-сторона границы (тест 15 держит fail-сторону при 2 символах)
    expect(formatContact("t.me/abc")).toBe(
      '<a href="https://t.me/abc">@abc</a>',
    );
  });
  it("15. t.me/ab (\\w{2}) → мимо ветки 1, plain", () => {
    expect(formatContact("t.me/ab")).toBe("t.me/ab");
  });
});

describe("formatContact · ветка 2 (хендл ^@?[a-zA-Z][\\w]{3,31}$)", () => {
  it("16. @durov", () => {
    expect(formatContact("@durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("17. durov (без @)", () => {
    expect(formatContact("durov")).toBe(
      '<a href="https://t.me/durov">@durov</a>',
    );
  });
  it("18. abcd — минимум 4 символа матчится", () => {
    expect(formatContact("abcd")).toBe(
      '<a href="https://t.me/abcd">@abcd</a>',
    );
  });
  it("19. abc — 3 символа → мимо, plain", () => {
    expect(formatContact("abc")).toBe("abc");
  });
  it("20. 32 символа — максимум матчится", () => {
    const h = "a" + "x".repeat(31);
    expect(formatContact(h)).toBe(`<a href="https://t.me/${h}">@${h}</a>`);
  });
  it("21. 33 символа — сверх максимума → plain", () => {
    const h = "a" + "x".repeat(32);
    expect(formatContact(h)).toBe(h);
  });
  it("22. 4durov — ведущая цифра отклонена → plain", () => {
    expect(formatContact("4durov")).toBe("4durov");
  });
  it("23. foo_bar — подчёркивание валидно (\\w)", () => {
    expect(formatContact("foo_bar")).toBe(
      '<a href="https://t.me/foo_bar">@foo_bar</a>',
    );
  });
  it("23b. ab12cd — цифры в середине хендла валидны (\\w)", () => {
    expect(formatContact("ab12cd")).toBe(
      '<a href="https://t.me/ab12cd">@ab12cd</a>',
    );
  });
});

describe("formatContact · ветка 3 (телефон)", () => {
  it("24. +79991234567", () => {
    expect(formatContact("+79991234567")).toBe(
      '<a href="tel:+79991234567">+79991234567</a>',
    );
  });
  it("25. +7 (999) 123-45-67 — href нормализован, лейбл оригинал (обе половины)", () => {
    expect(formatContact("+7 (999) 123-45-67")).toBe(
      '<a href="tel:+79991234567">+7 (999) 123-45-67</a>',
    );
  });
  it("26. 8 999 123 45 67 (без +)", () => {
    expect(formatContact("8 999 123 45 67")).toBe(
      '<a href="tel:89991234567">8 999 123 45 67</a>',
    );
  });
  it("27. 1234567 — минимум 7 цифр", () => {
    expect(formatContact("1234567")).toBe(
      '<a href="tel:1234567">1234567</a>',
    );
  });
  it("28. 123456 — 6 цифр → мимо, plain", () => {
    expect(formatContact("123456")).toBe("123456");
  });
  it("29. 15 цифр — максимум", () => {
    expect(formatContact("123456789012345")).toBe(
      '<a href="tel:123456789012345">123456789012345</a>',
    );
  });
  it("30. 16 цифр — сверх максимума → plain", () => {
    expect(formatContact("1234567890123456")).toBe("1234567890123456");
  });
  it("31. +7999X234567 — двойной сторож: буква в оригинале отклоняет → plain", () => {
    // digits прошли бы ^\+?\d{7,15}$, но второй guard ^[\d\s+()-]+$ ловит 'X'
    expect(formatContact("+7999X234567")).toBe("+7999X234567");
  });
});

describe("formatContact · ветка 4 (plain, экранированный)", () => {
  it("32. кириллица → plain без изменений", () => {
    expect(formatContact("звоните вечером")).toBe("звоните вечером");
  });
  it("33. HTML в тексте экранируется (backstop от инъекции)", () => {
    expect(formatContact("<b>hi</b>")).toBe("&lt;b&gt;hi&lt;/b&gt;");
  });
  it("34. пустая строка", () => {
    expect(formatContact("")).toBe("");
  });
});

describe("formatContact · приоритет и заморозки", () => {
  it("35. FROZEN: встроенный t.me/… в тексте линкуется, окружение отброшено", () => {
    // FROZEN: неякоренная ветка 1 линкует встроенный t.me/… и выкидывает
    // окружающие слова — намеренно, менять только с санкции владельца.
    expect(formatContact("пишите t.me/support")).toBe(
      '<a href="https://t.me/support">@support</a>',
    );
  });

  // 38–40: FROZEN — человеческое имя в поле контакта ветка 2 превращает в
  // ссылку Telegram. НЕ «чинить» ослаблением/удалением ветки 2 без санкции
  // владельца. Тесты падают громко при любом изменении.
  it("38. FROZEN: John → ссылка", () => {
    expect(formatContact("John")).toBe(
      '<a href="https://t.me/John">@John</a>',
    );
  });
  it("39. FROZEN: Anna → ссылка", () => {
    expect(formatContact("Anna")).toBe(
      '<a href="https://t.me/Anna">@Anna</a>',
    );
  });
  it("40. FROZEN-граница: Bob (3 буквы) → plain (порог 3-safe / 4-captured)", () => {
    expect(formatContact("Bob")).toBe("Bob");
  });

  it("41. 'durov please' — якорь ^…$ ветки 2 ловит хвост → plain", () => {
    expect(formatContact("durov please")).toBe("durov please");
  });
  it("42. '@durov please' — та же якорная отбраковка через @-форму → plain", () => {
    expect(formatContact("@durov please")).toBe("@durov please");
  });
});
