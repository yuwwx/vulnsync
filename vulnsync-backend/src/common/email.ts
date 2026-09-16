import { BadRequestException } from '@nestjs/common';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Разбирает список адресов (запятая / точка с запятой / перевод строки / пробел)
// в уникальный массив валидных адресов. Бросает ошибку при невалидном адресе.
export function parseEmailList(raw: string): string[] {
  const result: string[] = [];

  for (const token of raw.split(/[,;\s]+/)) {
    if (!token) {
      continue;
    }

    if (!EMAIL_RE.test(token)) {
      throw new BadRequestException(`Некорректный email: ${token}`);
    }

    if (!result.some((e) => e.toLowerCase() === token.toLowerCase())) {
      result.push(token);
    }
  }

  return result;
}
