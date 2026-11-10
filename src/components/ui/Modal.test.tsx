import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

/**
 * Фокус-трап модалки. Ключевой сценарий — `<video controls>` ПОСЛЕДНИМ
 * элементом панели: браузер ставит такой плеер в порядок Tab, и если список
 * трапа его не видит, «последним» он считает предыдущий элемент — тогда Tab с
 * плеера уводит фокус ИЗ диалога, и трап молча перестаёт работать.
 *
 * В портфолио видео стоит в середине панели (после «Закрыть», перед CTA),
 * поэтому там подмена границ незаметна. Здесь воспроизводим именно граничный
 * случай — иначе строка `video[controls]` в селекторе ничем не закреплена.
 *
 * jsdom-оговорка: он не считает <video> фокусируемым (в отличие от Chrome),
 * поэтому проверяем не фактический переход фокуса, а то, что трап ВЫБРАЛ этот
 * элемент как границу и позвал у него focus().
 */
describe("Modal · фокус-трап", () => {
  const renderModal = () =>
    render(
      <Modal open onClose={vi.fn()} title="Тест" bare>
        <button type="button">Первая</button>
        <video controls src="blob:video" data-testid="player" />
      </Modal>,
    );

  it("Shift+Tab с первого элемента уходит на видео как на ПОСЛЕДНЕЕ", () => {
    renderModal();
    const video = screen.getByTestId("player");
    const close = screen.getByRole("button", { name: "Закрыть" });
    const focusSpy = vi.spyOn(video, "focus");

    close.focus();
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    // Трап опознал плеер как последний фокусируемый элемент панели.
    expect(focusSpy).toHaveBeenCalled();
  });

  it("Tab с последнего элемента возвращает фокус в начало диалога", () => {
    render(
      <Modal open onClose={vi.fn()} title="Тест" bare>
        <button type="button">Первая</button>
        <button type="button">Последняя</button>
      </Modal>,
    );
    const close = screen.getByRole("button", { name: "Закрыть" });
    const last = screen.getByRole("button", { name: "Последняя" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus(); // фокус не ушёл из диалога
  });

  it("Escape закрывает диалог", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Тест">
        <button type="button">Внутри</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Modal · initialFocus и боковая панель", () => {
  it("initialFocus=panel: фокус на панели, а не на крестике", () => {
    // Окно, открытое без действия пользователя (приветственное), не должно
    // рисовать рамку фокуса на крестике.
    render(
      <Modal open onClose={vi.fn()} title="Тест" initialFocus="panel" bare>
        <button type="button">Действие</button>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("с панели Tab идёт на первый элемент, Shift+Tab — на последний, не наружу", () => {
    render(
      <>
        <button type="button">Снаружи</button>
        <Modal open onClose={vi.fn()} title="Тест" initialFocus="panel" bare>
          <button type="button">Действие</button>
          <button type="button">Последняя</button>
        </Modal>
      </>,
    );
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Закрыть" });
    const last = screen.getByRole("button", { name: "Последняя" });

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    dialog.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
  });

  it("по умолчанию фокус по-прежнему на первом элементе", () => {
    render(
      <Modal open onClose={vi.fn()} title="Тест" bare>
        <button type="button">Действие</button>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Закрыть" })).toHaveFocus();
  });

  it("placement=side остаётся доступным диалогом и закрывается по Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Условия" placement="side" bare>
        <p>Текст</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Условия");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
