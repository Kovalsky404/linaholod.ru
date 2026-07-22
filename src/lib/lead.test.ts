// @vitest-environment node
import { describe, it, expect } from "vitest";
import { validateLead, normalizeLead } from "./lead";

/**
 * F2 — чистые функции validateLead / normalizeLead.
 *
 * Правила набора (залочены в обсуждении):
 * - только toEqual (точный набор ключей); toMatchObject запрещён — иначе
 *   лишний/ошибочный ключ проскочит;
 * - строки границ — ASCII "a".repeat(N) без пробелов по краям, чтобы trim
 *   не менял длину незаметно;
 * - лимиты захардкожены как НЕЗАВИСИМЫЙ источник правды (не импортируем MAX):
 *   если число в исходнике поменяют, тест обязан покраснеть;
 * - каждая функция тестируется изолированно, без прогона одной через другую.
 *
 * Асимметрия по не-строкам: normalizeLead защищается (не-строка → ""),
 * а validateLead по контракту принимает string (Partial<LeadInput>) и
 * вызывает .trim() напрямую — не-строковый вход вне контракта и НЕ тестируется.
 */

// mirror of MAX.* in src/lib/lead.ts — NOT imported on purpose
const NAME_MAX = 100;
const CONTACT_MAX = 120;
const SERVICE_MAX = 120;
const MESSAGE_MAX = 2000;
const COMPANY_MAX = 100; // bare literal в normalizeLead (не в MAX) — сторож дрейфа

const ERR = {
  name: "Укажите имя",
  contact: "Укажите телефон или Telegram",
  nameLong: "Слишком длинное имя",
  contactLong: "Слишком длинный контакт",
} as const;

describe("validateLead · базовый контракт", () => {
  it("1. валидный вход → {}", () => {
    expect(validateLead({ name: "Иван", contact: "+79991234567" })).toEqual({});
  });

  it("2. нет имени → только name", () => {
    const r = validateLead({ contact: "tg@ivan" });
    expect(r).toEqual({ name: ERR.name });
    expect(r.contact).toBeUndefined();
  });

  it("3. пустое имя → как отсутствующее", () => {
    expect(validateLead({ name: "", contact: "tg@ivan" })).toEqual({
      name: ERR.name,
    });
  });

  it("4. нет контакта → только contact", () => {
    const r = validateLead({ name: "Иван" });
    expect(r).toEqual({ contact: ERR.contact });
    expect(r.name).toBeUndefined();
  });

  it("5. пустой контакт → как отсутствующий", () => {
    expect(validateLead({ name: "Иван", contact: "" })).toEqual({
      contact: ERR.contact,
    });
  });

  it("6. оба отсутствуют → оба ключа", () => {
    expect(validateLead({})).toEqual({ name: ERR.name, contact: ERR.contact });
  });

  it("7. имя из пробелов → пусто (trim)", () => {
    expect(validateLead({ name: "   ", contact: "tg@ivan" })).toEqual({
      name: ERR.name,
    });
  });

  it("8. контакт из whitespace (\\t \\n) → пусто (trim, а не === ' ')", () => {
    expect(validateLead({ name: "Иван", contact: "\t \n" })).toEqual({
      contact: ERR.contact,
    });
  });

  it("9. null/undefined поля → оба ключа (ветка ?? '')", () => {
    expect(
      validateLead({
        name: null as unknown as string,
        contact: undefined,
      }),
    ).toEqual({ name: ERR.name, contact: ERR.contact });
  });
});

describe("validateLead · границы длины (недостижимы через route)", () => {
  it("10. имя ровно 100 → {}", () => {
    expect(
      validateLead({ name: "a".repeat(NAME_MAX), contact: "+79991234567" }),
    ).toEqual({});
  });

  it("11. имя 101 → длинное имя, contact отсутствует", () => {
    const r = validateLead({
      name: "a".repeat(NAME_MAX + 1),
      contact: "+79991234567",
    });
    expect(r).toEqual({ name: ERR.nameLong });
    expect(r.contact).toBeUndefined();
  });

  it("12. контакт ровно 120 → {}", () => {
    expect(
      validateLead({ name: "Иван", contact: "a".repeat(CONTACT_MAX) }),
    ).toEqual({});
  });

  it("13. контакт 121 → длинный контакт, name отсутствует", () => {
    const r = validateLead({
      name: "Иван",
      contact: "a".repeat(CONTACT_MAX + 1),
    });
    expect(r).toEqual({ contact: ERR.contactLong });
    expect(r.name).toBeUndefined();
  });

  it("13b. оба поля переполнены одновременно → оба *Long", () => {
    expect(
      validateLead({
        name: "a".repeat(NAME_MAX + 1),
        contact: "a".repeat(CONTACT_MAX + 1),
      }),
    ).toEqual({ name: ERR.nameLong, contact: ERR.contactLong });
  });

  it("14. слишком длинное → ошибка ДЛИНЫ, не пустоты (else if)", () => {
    const r = validateLead({
      name: "a".repeat(NAME_MAX + 1),
      contact: "+79991234567",
    });
    expect(r.name).toBe(ERR.nameLong);
    expect(r.name).not.toBe(ERR.name);
  });

  it("15. длина считается по обрезанному значению (trim → потом длина)", () => {
    // 104 сырых, 100 после trim → ошибки нет
    expect(
      validateLead({
        name: "  " + "a".repeat(NAME_MAX) + "  ",
        contact: "+79991234567",
      }),
    ).toEqual({});
  });
});

describe("validateLead · иммутабельность", () => {
  it("16. не мутирует вход", () => {
    const input = { name: "  Иван  ", contact: "  tg  " };
    const snapshot = structuredClone(input);
    validateLead(input);
    expect(input).toEqual(snapshot);
  });
});

describe("normalizeLead · базовый контракт", () => {
  it("17. тримит все пять полей", () => {
    expect(
      normalizeLead({
        name: "  Иван  ",
        contact: "  tg@ivan  ",
        service: "  Монтаж  ",
        message: "  hi  ",
        company: "  x  ",
      }),
    ).toEqual({
      name: "Иван",
      contact: "tg@ivan",
      service: "Монтаж",
      message: "hi",
      company: "x",
    });
  });

  it("18. на пустом входе — все 5 ключей как строки", () => {
    const r = normalizeLead({});
    expect(r).toEqual({
      name: "",
      contact: "",
      service: "",
      message: "",
      company: "",
    });
    expect(Object.keys(r).sort()).toEqual([
      "company",
      "contact",
      "message",
      "name",
      "service",
    ]);
  });

  it("19. чистые значения под лимитом — без изменений", () => {
    const clean = {
      name: "Иван",
      contact: "+79991234567",
      service: "Консультация",
      message: "Здравствуйте",
      company: "",
    };
    expect(normalizeLead(clean)).toEqual(clean);
  });
});

describe("normalizeLead · обрезка по лимиту", () => {
  it("20. name → 100", () => {
    const r = normalizeLead({ name: "a".repeat(150) });
    expect(r.name).toBe("a".repeat(NAME_MAX));
    expect(r.name.length).toBe(NAME_MAX);
  });

  it("21. contact → 120", () => {
    expect(normalizeLead({ contact: "a".repeat(150) }).contact).toBe(
      "a".repeat(CONTACT_MAX),
    );
  });

  it("22. service → 120", () => {
    expect(normalizeLead({ service: "a".repeat(150) }).service).toBe(
      "a".repeat(SERVICE_MAX),
    );
  });

  it("23. message → 2000", () => {
    expect(normalizeLead({ message: "a".repeat(2500) }).message).toBe(
      "a".repeat(MESSAGE_MAX),
    );
  });

  it("24. company → 100 (сторож голого литерала)", () => {
    expect(normalizeLead({ company: "a".repeat(150) }).company).toBe(
      "a".repeat(COMPANY_MAX),
    );
  });

  it("25. значения ровно на лимите — не режутся", () => {
    const atMax = {
      name: "a".repeat(NAME_MAX),
      contact: "a".repeat(CONTACT_MAX),
      service: "a".repeat(SERVICE_MAX),
      message: "a".repeat(MESSAGE_MAX),
      company: "a".repeat(COMPANY_MAX),
    };
    expect(normalizeLead(atMax)).toEqual(atMax);
  });
});

describe("normalizeLead · порядок trim → slice", () => {
  it("26. сначала trim, потом slice (иначе было бы 98)", () => {
    const r = normalizeLead({ name: "  " + "a".repeat(NAME_MAX) + "  " });
    expect(r.name).toBe("a".repeat(NAME_MAX));
    expect(r.name.length).toBe(NAME_MAX);
  });

  it("27. пробелы + переполнение: trim, затем обрезка", () => {
    const r = normalizeLead({ name: "  " + "a".repeat(300) });
    expect(r.name).toBe("a".repeat(NAME_MAX));
  });
});

describe("normalizeLead · коэрция не-строк → ''", () => {
  // См. заголовочный комментарий: validateLead ассиметрично НЕ защищается —
  // по контракту вход строковый; здесь тестируем именно защиту normalize.
  it("28. число → ''", () => {
    expect(normalizeLead({ name: 12345 as unknown as string }).name).toBe("");
  });

  it("29. null → ''", () => {
    expect(
      normalizeLead({ contact: null as unknown as string }).contact,
    ).toBe("");
  });

  it("30. явный undefined → ''", () => {
    expect(normalizeLead({ service: undefined }).service).toBe("");
  });

  it("31. объект → '' (не '[object Object]')", () => {
    expect(
      normalizeLead({ message: {} as unknown as string }).message,
    ).toBe("");
  });

  it("32. boolean/массив → '' (точная проверка typeof)", () => {
    const r = normalizeLead({
      company: [] as unknown as string,
      name: true as unknown as string,
    });
    expect(r.company).toBe("");
    expect(r.name).toBe("");
  });
});

describe("normalizeLead · смешанный вход + иммутабельность", () => {
  it("33. один вызов, полный toEqual (нет утечки поля в поле)", () => {
    expect(
      normalizeLead({
        name: "a".repeat(150),
        contact: "  +79990001122  ",
        service: 99 as unknown as string,
        message: "a".repeat(MESSAGE_MAX),
        company: "  Acme  ",
      }),
    ).toEqual({
      name: "a".repeat(NAME_MAX),
      contact: "+79990001122",
      service: "",
      message: "a".repeat(MESSAGE_MAX),
      company: "Acme",
    });
  });

  it("34. не мутирует вход", () => {
    const input = {
      name: "  " + "a".repeat(150),
      contact: "  tg  ",
      message: 5 as unknown as string,
    };
    const snapshot = structuredClone(input);
    normalizeLead(input);
    expect(input).toEqual(snapshot);
  });
});
