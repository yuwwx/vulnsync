import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { JiraMappingsService } from './jira-mappings.service';
import { JiraMappingsController } from './jira-mappings.controller';

@Module({
  imports: [PrismaModule],
  providers: [JiraMappingsService],
  controllers: [JiraMappingsController],
  exports: [JiraMappingsService],
})
export class MappingsModule {}
