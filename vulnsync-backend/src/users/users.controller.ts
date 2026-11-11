import { LogAction } from '@/common/decorators/logAction.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdateUserProductTypesDto } from './dto/update-user-product-types.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private service: UsersService) {}

  @LogAction('USERS_GET')
  @Get()
  list() {
    return this.service.list();
  }

  @LogAction('USERS_UPDATE_PRODUCT_TYPES')
  @Patch(':id/product-types')
  updateProductTypes(
    @Param('id') id: string,
    @Body() dto: UpdateUserProductTypesDto,
  ) {
    return this.service.updateProductTypes(id, dto.allowedProductTypeIds);
  }
}
