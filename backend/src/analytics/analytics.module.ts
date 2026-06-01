import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Document } from '../entities/document.entity';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [TypeOrmModule.forFeature([Document]), LoggerModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}