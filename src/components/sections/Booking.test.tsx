import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Booking } from "./Booking";
import type { ServiceView } from "@/sanity/types";

/**
 * F6 — форма записи (RTL, jsdom). Проверяем то, что видит/делает пользователь:
 * гейт согласия (152-ФЗ), клиентскую валидацию, кастомный Select, submit-контракт
 * с /api/lead и состояния success/error. Серверная логика — в route.test.ts;
 * здесь останавливаемся на «клиент шлёт правильный payload и отражает ответ».
 */

// Компонент читает только title/price — минимальные услуги под каст.
// Две услуги (три опции с «Не выбрано») — чтобы нав по клавиатуре был осмыслен.
const services = [
  { title: "Разбор гардероба", price: "5 000 ₽" },
  { title: "Консультация", price: "10 000 ₽" },
] as unknown as ServiceView[];

const OPTION_LABEL = "Разбор гардероба — 5 000 ₽";
const OPTION_VALUE = "Разбор гардероба"; // payload.service === title, не label

let fetchMock: ReturnType<typeof vi.fn>;

function okResponse(json: unknown = { ok: true }) {
  return { ok: true, json: () => Promise.resolve(json) };
}

beforeEach(() => {
  fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const submitBtn = () => screen.getByRole("button", { name: /Отправ/ });
const nameField = () => screen.getByLabelText(/Имя/);
const contactField = () => screen.getByLabelText(/Телефон или Telegram/);
const consentBox = () => screen.getByRole("checkbox");
const bodyOf = (call = 0) =>
  JSON.parse((fetchMock.mock.calls[call]![1] as { body: string }).body);

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameField(), "Аня");
  await user.type(contactField(), "+79991234567");
}

// ───────────────────── Гейт согласия (главное) ─────────────────────
describe("F6 · гейт согласия (152-ФЗ)", () => {
  it("1. валидные имя+контакт, согласие НЕ отмечено → submit заблокирован", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(submitBtn());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Чтобы отправить заявку, отметьте согласие."),
    ).toBeInTheDocument();
    expect(consentBox()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Заявка отправлена/)).not.toBeInTheDocument();
  });

  it("2. отметить согласие и отправить снова → fetch ровно один раз, без ключа consent", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(submitBtn()); // заблокировано
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await screen.findByText(/Заявка отправлена/);
    const body = bodyOf();
    expect(body).toEqual({
      name: "Аня",
      contact: "+79991234567",
      service: "",
      message: "",
      company: "",
    });
    expect(body).not.toHaveProperty("consent");
  });

  it("2b. невалидные поля + без согласия → сначала ошибка ПОЛЕЙ, не согласия, без fetch", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await user.click(submitBtn()); // всё пусто, согласие не отмечено

    // валидация полей срабатывает ПЕРВОЙ (порядок в onSubmit)
    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(
      screen.queryByText("Чтобы отправить заявку, отметьте согласие."),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ───────────────────── Успешный submit (контракт) ─────────────────────
describe("F6 · успешный submit", () => {
  it("3. минимальная валидная форма → POST /api/lead, success UI, сброс полей", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    await screen.findByText("Заявка отправлена! Скоро свяжусь с вами.");
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/lead");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(bodyOf()).toEqual({
      name: "Аня",
      contact: "+79991234567",
      service: "",
      message: "",
      company: "", // honeypot пуст при обычном заполнении
    });
    // форма сброшена
    expect(nameField()).toHaveValue("");
    expect(contactField()).toHaveValue("");
    expect(consentBox()).not.toBeChecked();
    expect(submitBtn()).toBeEnabled();
  });

  it("4. полная форма (услуга + сообщение) → payload несёт их", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Услуга" })); // открыть
    await user.click(screen.getByRole("option", { name: OPTION_LABEL }));
    await user.type(screen.getByLabelText("Сообщение"), "Хочу разбор");
    await user.click(consentBox());
    await user.click(submitBtn());

    await screen.findByText(/Заявка отправлена/);
    expect(bodyOf()).toEqual({
      name: "Аня",
      contact: "+79991234567",
      service: OPTION_VALUE,
      message: "Хочу разбор",
      company: "",
    });
  });
});

// ───────────────────── Клиентская валидация ─────────────────────
describe("F6 · валидация (зеркалит lead.ts)", () => {
  it("5. пустое имя → 'Укажите имя', без fetch", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await user.type(contactField(), "+79991234567");
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(nameField()).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("6. пустой контакт → 'Укажите телефон или Telegram', без fetch", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await user.type(nameField(), "Аня");
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(
      await screen.findByText("Укажите телефон или Telegram"),
    ).toBeInTheDocument();
    expect(contactField()).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("7. оба пустые → обе ошибки, без fetch", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(
      screen.getByText("Укажите телефон или Telegram"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("8. имя из пробелов → 'Укажите имя' (trim), без fetch", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await user.type(nameField(), "   ");
    await user.type(contactField(), "+79991234567");
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ───────────────────── Кастомный Select ─────────────────────
describe("F6 · кастомный Select", () => {
  it("9. выбор КЛАВИАТУРОЙ → значение в payload", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);

    const trigger = screen.getByRole("button", { name: "Услуга" });
    trigger.focus();
    await user.keyboard("{ArrowDown}"); // открыть (active = 0 «Не выбрано»)
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowDown}"); // active = 1 «Разбор гардероба»
    await user.keyboard("{Enter}"); // выбрать
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent(OPTION_LABEL);

    await user.click(consentBox());
    await user.click(submitBtn());
    await screen.findByText(/Заявка отправлена/);
    expect(bodyOf().service).toBe(OPTION_VALUE);
  });

  it("10. выбор КЛИКОМ → значение в payload", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Услуга" }));
    await user.click(screen.getByRole("option", { name: OPTION_LABEL }));

    await user.click(consentBox());
    await user.click(submitBtn());
    await screen.findByText(/Заявка отправлена/);
    expect(bodyOf().service).toBe(OPTION_VALUE);
  });

  it("11. без выбора → service '' (и вариант 'Не выбрано')", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());
    await screen.findByText(/Заявка отправлена/);
    expect(bodyOf().service).toBe("");
  });

  it("12. a11y: haspopup/expanded/activedescendant", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    const trigger = screen.getByRole("button", { name: "Услуга" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toHaveAttribute(
      "aria-activedescendant",
    );
  });

  it("12b. aria-activedescendant отслеживает активную опцию + wrap-around", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    const trigger = screen.getByRole("button", { name: "Услуга" });
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option"); // Не выбрано, Разбор, Консультация
    expect(options).toHaveLength(3);

    await user.click(trigger); // открыть; active = 0 (текущее значение "")
    expect(listbox).toHaveAttribute("aria-activedescendant", options[0]!.id);
    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", options[1]!.id);
    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", options[2]!.id);
    await user.keyboard("{ArrowDown}"); // wrap → 0
    expect(listbox).toHaveAttribute("aria-activedescendant", options[0]!.id);
  });

  it("12c. Escape закрывает список", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    const trigger = screen.getByRole("button", { name: "Услуга" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("12d. typeahead: буква переводит активную опцию", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    const trigger = screen.getByRole("button", { name: "Услуга" });
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    await user.click(trigger); // active 0
    await user.keyboard("к"); // «Консультация — …» на «к» → index 2
    expect(listbox).toHaveAttribute("aria-activedescendant", options[2]!.id);
  });
});

// ───────────────────── Ошибочные ответы (нет ложного успеха) ─────────────────────
describe("F6 · пути ошибок", () => {
  it("13. сервер не-ok + fields → ошибка в статусе + поле aria-invalid, без сброса", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          ok: false,
          error: "Проверьте поля формы.",
          fields: { contact: "Укажите телефон или Telegram" },
        }),
    });
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(
      await screen.findByText("Проверьте поля формы."),
    ).toBeInTheDocument();
    expect(contactField()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Заявка отправлена/)).not.toBeInTheDocument();
    expect(nameField()).toHaveValue("Аня"); // форма НЕ сброшена
    expect(submitBtn()).toBeEnabled();
  });

  it("14. json.ok=false → ошибка (клиент читает флаг тела, не HTTP-статус)", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ ok: false, error: "Серверная ошибка." }),
    );
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(await screen.findByText("Серверная ошибка.")).toBeInTheDocument();
    expect(screen.queryByText(/Заявка отправлена/)).not.toBeInTheDocument();
    expect(nameField()).toHaveValue("Аня"); // форма не сброшена при ошибке
  });

  it("14b. клиент доверяет json.ok и ИГНОРИРУЕТ HTTP-статус (res.ok=false + json.ok=true → успех)", async () => {
    // Реальное условие успеха — `if (json.ok)`, а не `res.ok && json.ok`.
    // Роут держит статус и флаг согласованными; это регресс-лок на контракт
    // «клиент решает по телу ответа». Смена на проверку res.ok покраснит тест.
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ ok: true }),
    });
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(await screen.findByText(/Заявка отправлена/)).toBeInTheDocument();
  });

  it("15. сеть упала (reject) → сетевая ошибка", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(
      await screen.findByText("Проблема с сетью. Попробуйте позже."),
    ).toBeInTheDocument();
    expect(nameField()).toHaveValue("Аня");
  });
});

// ───────────────────── Загрузка + honeypot ─────────────────────
describe("F6 · загрузка и honeypot", () => {
  it("16. in-flight → кнопка disabled 'Отправка…', один POST", async () => {
    let resolveFetch!: (v: unknown) => void;
    fetchMock.mockReturnValue(
      new Promise((res) => {
        resolveFetch = res;
      }),
    );
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    await user.click(submitBtn());

    expect(submitBtn()).toBeDisabled();
    expect(submitBtn()).toHaveTextContent("Отправка…");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: () => Promise.resolve({ ok: true }) });
    await screen.findByText(/Заявка отправлена/);
    expect(submitBtn()).toBeEnabled();
  });

  it("17. honeypot: ровно 3 textbox'а, company не в tab-порядке", () => {
    render(<Booking services={services} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(3); // имя, контакт, сообщение
    const company = document.querySelector('input[name="company"]');
    expect(company).toBeTruthy();
    expect(company).toHaveAttribute("tabindex", "-1");
  });

  it("19. honeypot заполнен → company В payload (клиент не шортит, это делает сервер)", async () => {
    const user = userEvent.setup();
    render(<Booking services={services} />);
    await fillBasics(user);
    await user.click(consentBox());
    // бот заполнил скрытое поле
    fireEvent.change(document.querySelector('input[name="company"]')!, {
      target: { value: "bot" },
    });
    await user.click(submitBtn());

    await screen.findByText(/Заявка отправлена/);
    expect(bodyOf().company).toBe("bot");
  });
});

// ───────────────────── Доступность ─────────────────────
describe("F6 · доступность", () => {
  it("20. поля по label, aria-required, статус-регион", () => {
    render(<Booking services={services} />);
    expect(nameField()).toHaveAttribute("aria-required", "true");
    expect(contactField()).toHaveAttribute("aria-required", "true");
    expect(consentBox()).toHaveAttribute("aria-required", "true");
    // единый регион результата
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
