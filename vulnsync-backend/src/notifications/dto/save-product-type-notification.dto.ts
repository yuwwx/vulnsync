import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SaveProductTypeNotificationDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductTypeId: number;

  // Список адресов через запятую, точку с запятой или с новой строки
  @IsString()
  @IsNotEmpty()
  emails: string;
}
