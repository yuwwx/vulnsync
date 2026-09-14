import { Module } from '@nestjs/common';
import { ProductTypeNotificationsController } from './product-type-notifications.controller';
import { ProductTypeNotificationsService } from './product-type-notifications.service';

@Module({
  controllers: [ProductTypeNotificationsController],
  providers: [ProductTypeNotificationsService],
  exports: [ProductTypeNotificationsService],
})
export class NotificationsModule {}
