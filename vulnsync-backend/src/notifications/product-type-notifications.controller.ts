import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SaveProductTypeNotificationDto } from './dto/save-product-type-notification.dto';
import { ProductTypeNotificationsService } from './product-type-notifications.service';

@Controller('notifications/product-type')
export class ProductTypeNotificationsController {
  constructor(private service: ProductTypeNotificationsService) {}

  @LogAction('PRODUCT_TYPE_NOTIFICATIONS_GET')
  @Get()
  get(@Query('ddProductTypeId') ddProductTypeId?: number) {
    if (ddProductTypeId) {
      return this.service.getByProductType(ddProductTypeId);
    }
    return this.service.getAll();
  }

  @LogAction('PRODUCT_TYPE_NOTIFICATIONS_SAVE')
  @Roles('ADMIN')
  @Post()
  save(@Body() dto: SaveProductTypeNotificationDto) {
    return this.service.save(dto.ddProductTypeId, dto.emails);
  }
}
