/**
 * Общие типы и валидация заявки — используются и на клиенте (форма),
 * и на сервере (API route), чтобы правила совпадали.
 */

export type LeadInput = {
  name: string;
  contact: string;
  service?: string;
  message?: string;
  /** Honeypot: реальные пользователи оставляют пустым. */
  company?: string;
};

export type LeadErrors = Partial<Record<"name" | "contact", string>>;

const MAX = { name: 100, contact: 120, service: 120, message: 2000 } as const;

/**
 * Чистая валидация без побочных эффектов. Возвращает объект ошибок
 * (пустой — значит всё ок). Обрезку длины делает уже нормализация.
 */
export function validateLead(input: Partial<LeadInput>): LeadErrors {
  const errors: LeadErrors = {};

  const name = (input.name ?? "").trim();
  const contact = (input.contact ?? "").trim();

  if (!name) errors.name = "Укажите имя";
  else if (name.length > MAX.name) errors.name = "Слишком длинное имя";

  if (!contact) errors.contact = "Укажите телефон или Telegram";
  else if (contact.length > MAX.contact)
    errors.contact = "Слишком длинный контакт";

  return errors;
}

/** Приводит вход к безопасному виду: trim + обрезка по максимуму длины. */
export function normalizeLead(input: Partial<LeadInput>): LeadInput {
  const clip = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  return {
    name: clip(input.name, MAX.name),
    contact: clip(input.contact, MAX.contact),
    service: clip(input.service, MAX.service),
    message: clip(input.message, MAX.message),
    company: clip(input.company, 100),
  };
}
