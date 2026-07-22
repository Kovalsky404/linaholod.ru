import { describe, it, expect } from "vitest";

/** Смоук: убеждаемся, что рантайм тестов и jsdom+jest-dom матчеры работают. */
describe("тестовый рантайм", () => {
  it("jsdom и jest-dom доступны", () => {
    const el = document.createElement("div");
    el.textContent = "ok";
    document.body.append(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("ok");
  });
});
