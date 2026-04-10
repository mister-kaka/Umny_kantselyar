import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Document } from '../entities/document.entity';
import { DocumentRoute } from '../entities/document-route.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentRoute])],
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule {}
