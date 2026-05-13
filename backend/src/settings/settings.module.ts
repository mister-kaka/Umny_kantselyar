import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AiSetting } from '../entities/ai-setting.entity';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiSetting]),
    LoggerModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}