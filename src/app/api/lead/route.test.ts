// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/**
 * F1 — Lead-пайплайн POST /api/lead (интеграция хендлера).
 *
 * Harness (залочен в обсуждении):
 * - зовём экспортированный POST напрямую с WHATWG Request (без поднятия сервера)
 *   — максимум реальной логики, минимум флака;
 * - мокаем ТОЛЬКО fetch (Telegram) и env; вся остальная логика — настоящая;
 * - изоляция rate-limit без возни с модульным состоянием: у каждого теста
 *   уникальный IP в x-forwarded-for → отдельная корзина в Map `hits`;
 * - каждое утверждение про Telegram декодирует fetch.mock.calls (не внутренности);
 * - пары «есть/нет», точные счётчики вызовов; fake timers — только для окна;
 * - assertNoLeak() на 400/429/500: наружу не утекают токен/chat_id/хост/статус.
 */

const TOKEN = "TESTTOKEN";
const TG_URL = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
const VALID = { name: "Аня", contact: "+79991234567" };

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

// Уникальный IP на каждый тест (в тестах rate-limit переиспользуется в рамках теста).
let ipSeq = 0;
const nextIp = () => `10.10.${ipSeq++}.1`;

function makeReq(body: unknown, ip: string): Request {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: raw,
  });
}
const post = (body: unknown, ip = nextIp()) => POST(makeReq(body, ip));

const bodies = () =>
  fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string));
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));

/** Наружу не должно утекать ничего чувствительного/внутреннего. */
function assertNoLeak(json: unknown, chatIds: string[] = ["111", "222", "333"]) {
  const s = JSON.stringify(json);
  expect(s).not.toContain(TOKEN);
  expect(s).not.toContain("api.telegram.org");
  expect(s).not.toContain("sendMessage");
  expect(s).not.toContain("403");
  for (const id of chatIds) expect(s).not.toContain(`"${id}"`);
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN);
  vi.stubEnv("TELEGRAM_CHAT_ID", "111");
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("F1 · core contract", () => {
  it("1. happy path (один chat) + конверт сообщения", async () => {
    const res = await post(VALID);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urls()[0]).toBe(TG_URL);
    // HTTP-контракт запроса к Telegram (иначе POST→GET/неверный тип прошли бы)
    const opts = fetchMock.mock.calls[0]![1];
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");

    const b = bodies()[0];
    expect(b.chat_id).toBe("111");
    expect(b.parse_mode).toBe("HTML");
    expect(b.disable_web_page_preview).toBe(true);
    // данные
    expect(b.text).toContain("Аня");
    // телефон делегирован formatContact и попал на провод дословно (не только 📞)
    expect(b.text).toContain('<a href="tel:+79991234567">');
    // структура «карточек» через join("\n\n") + ОБА разделителя — чтобы
    // схлопывание join("") или потеря разделителя не прошли незамеченными
    expect(b.text).toContain("🔔 <b>Новая заявка с сайта</b>\n\n");
    expect(b.text).toContain("\n\n🌐 <i>Lina H. — стилист</i>");
    expect(b.text.split("➖➖➖➖➖➖➖➖➖➖").length - 1).toBe(2);
  });

  it("2. fan-out на несколько chat_id (запятая/пробел/;)", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "111, 222; 333");
    const res = await post(VALID);
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const ids = bodies().map((b) => b.chat_id);
    expect(new Set(ids)).toEqual(new Set(["111", "222", "333"]));
    // всем — одинаковый текст и HTML, метод POST, один и тот же endpoint
    expect(new Set(bodies().map((b) => b.text)).size).toBe(1);
    for (const b of bodies()) expect(b.parse_mode).toBe("HTML");
    for (const u of urls()) expect(u).toBe(TG_URL);
    for (const c of fetchMock.mock.calls) expect(c[1].method).toBe("POST");
  });

  it("3. honeypot заполнен → тихий успех, НОЛЬ обращений в Telegram", async () => {
    const res = await post({ ...VALID, company: "bot" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("4. honeypot срабатывает раньше валидации (порядок)", async () => {
    const res = await post({ company: "bot" }); // name/contact отсутствуют
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(json.fields).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("5. битый JSON → 400, без отправки, без утечек", async () => {
    const res = await post("{ не json");
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, error: "Некорректный запрос." });
    expect(fetchMock).not.toHaveBeenCalled();
    assertNoLeak(json);
  });

  it("6. нет имени → 400 + только поле name", async () => {
    const res = await post({ contact: "+79991234567" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.fields.name).toBe("Укажите имя");
    expect(json.fields.contact).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    assertNoLeak(json);
  });

  it("7. нет контакта → 400 + только поле contact", async () => {
    const res = await post({ name: "Аня" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fields.contact).toBe("Укажите телефон или Telegram");
    expect(json.fields.name).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("8. пусто → 400 + ОБА поля", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fields.name).toBeDefined();
    expect(json.fields.contact).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("9. слишком длинное имя ОБРЕЗАЕТСЯ до 100, а не режектится", async () => {
    const res = await post({ name: "a".repeat(150), contact: "+79991234567" });
    expect(res.status).toBe(200); // не 400 — normalize клипит до validate
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const text = bodies()[0].text as string;
    expect(text).toContain("a".repeat(100));
    expect(text).not.toContain("a".repeat(101));
  });
});

describe("F1 · rate limit", () => {
  it("10. граница: 5 проходят, 6-й — 429; отправок ровно 5", async () => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(VALID, ip)).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("11. FROZEN: отклонённые запросы тоже тратят окно", async () => {
    // FROZEN BEHAVIOR — согласовано с владельцем, в этом проходе НЕ «чиним».
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      expect((await post("{плохо", ip)).status).toBe(400);
    }
    const res = await post(VALID, ip);
    expect(res.status).toBe(429);
    assertNoLeak(await res.json());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("12. окно истекает (fake timers) → снова 200", async () => {
    vi.useFakeTimers();
    const ip = nextIp();
    for (let i = 0; i < 6; i++) await post(VALID, ip); // добиваем до 429
    vi.advanceTimersByTime(60_001);
    const res = await post(VALID, ip);
    expect(res.status).toBe(200);
  });
});

describe("F1 · сбои Telegram", () => {
  it("13. Telegram ответил не-OK → 500 (деталь скрыта)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const res = await post(VALID);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toMatchObject({
      ok: false,
      error: "Не удалось отправить заявку. Попробуйте позже.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    assertNoLeak(json);
  });

  it("14. fetch бросает исключение → 500", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(errorSpy).toHaveBeenCalled();
    assertNoLeak(await res.json());
  });

  it("15. частичный сбой (один из двух) → 200 + выживший получил валидное сообщение", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "111,222");
    fetchMock.mockImplementation(
      async (_url: string, opts: { body: string }) => {
        const chatId = JSON.parse(opts.body).chat_id;
        if (chatId === "222") throw new Error("boom");
        return { ok: true };
      },
    );
    const res = await post(VALID);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // выживший (111) получил ПОЛНЫЙ конверт, а не огрызок
    const ok = bodies().find((b) => b.chat_id === "111");
    expect(ok).toBeTruthy();
    expect(ok.text).toContain("🔔");
    expect(ok.text).toContain("Аня");
    expect(ok.text).toContain("📞");
  });

  it("16. окружение не настроено → 500 + лог, без fetch", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("не заданы"));
    assertNoLeak(await res.json());
  });

  it("16b. пустой TELEGRAM_CHAT_ID → 500 + лог, без fetch", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("не заданы"));
  });

  it("17. TELEGRAM_CHAT_ID пуст после разбора → 500 + лог", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", " , ; ");
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("пуст после разбора"),
    );
  });
});

describe("F1 · безопасность payload и шаблон", () => {
  it("18. HTML-инъекция в имени экранируется", async () => {
    const res = await post({
      name: "<script>alert(1)</script>",
      contact: "+79991234567",
    });
    expect(res.status).toBe(200);
    const text = bodies()[0].text as string;
    expect(text).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(text).not.toContain("<script>");
  });

  it("19. & и угловые скобки в сообщении, без двойного экранирования", async () => {
    const res = await post({ ...VALID, message: "Tom & Jerry <3" });
    expect(res.status).toBe(200);
    const text = bodies()[0].text as string;
    expect(text).toContain("Tom &amp; Jerry &lt;3");
    expect(text).not.toContain("&amp;amp;");
  });

  it("20. опциональные строки: отсутствуют без данных, появляются с данными", async () => {
    // (a) без service/message
    await post(VALID);
    let text = bodies()[0].text as string;
    expect(text).not.toContain("Услуга");
    expect(text).not.toContain("Сообщение");

    // (b) с service + message
    fetchMock.mockClear();
    await post({ ...VALID, service: "Разбор гардероба", message: "Привет" });
    text = bodies()[0].text as string;
    expect(text).toContain("✂️");
    expect(text).toContain("Разбор гардероба");
    expect(text).toContain("💬");
    expect(text).toContain("Привет");
  });

  it("21. route делегирует форматирование контакта и отдаёт результат дословно", async () => {
    const res = await post({ name: "Аня", contact: "@durov" });
    expect(res.status).toBe(200);
    const text = bodies()[0].text as string;
    expect(text).toContain('<a href="https://t.me/durov">@durov</a>');
  });
});
