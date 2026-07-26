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
