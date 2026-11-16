import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SaveProductTypeNotificationDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductTypeId: number;

  // Список адресов через запятую, точку с запятой или с новой строки.
  // Пустая строка допустима: дополнительных получателей нет.
  @IsString()
  emails: string;
}
