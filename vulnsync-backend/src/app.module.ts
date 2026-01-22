// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { VulnerabilitiesModule } from './vulnerabilities/vulnerabilities.module';
import { JiraModule } from './integrations/jira/jira.module';
import { DependencyTrackModule } from './integrations/dependency-track/dependency-track.module';
import { DefectDojoModule } from './integrations/defectdojo/defectdojo.module';

import { JwtAuthGuard } from './common/guards/auth.guard';
import { LogsModule } from './logs/logs.module';

import { ConfigModule } from '@nestjs/config';
import { MappingsModule } from './mappings/mappings.module';
import path from 'node:path';

const envFile =
  process.env.NODE_ENV === 'development'
    ? path.resolve(__dirname, '../../../.env.dev')
    : undefined;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFile,
    }),
    LogsModule,
    PrismaModule,
    AuthModule,
    SettingsModule,
    VulnerabilitiesModule,
    JiraModule,
    DependencyTrackModule,
    DefectDojoModule,
    MappingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
