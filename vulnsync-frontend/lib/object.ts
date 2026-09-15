// Возвращает копию объекта без системных полей (id, даты и т.п.).
// Используется перед отправкой сущностей на бэкенд.
export function stripFields<T extends object>(
  obj: T,
  fields: readonly string[],
): T {
  const copy = { ...obj } as T & Record<string, unknown>;
  fields.forEach((field) => delete copy[field]);
  return copy;
}
