import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SaveProductNotificationDto {
  @IsNumber()
  @IsNotEmpty()
  ddProductId: number;

  // Список адресов через запятую, точку с запятой или с новой строки
  @IsString()
  @IsNotEmpty()
  emails: string;
}
