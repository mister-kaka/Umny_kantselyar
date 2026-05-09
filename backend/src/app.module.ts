import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './logger/logger.module';

import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentCategory } from './entities/document-category.entity';
import { Document } from './entities/document.entity';
import { DocumentRoute } from './entities/document-route.entity';
import { DocumentSource } from './entities/document-source.entity';
import { DocumentFile } from './entities/document-file.entity';
import { OcrResult } from './entities/ocr-result.entity';
import { DocumentClassification } from './entities/document-classification.entity';
import { AiSetting } from './entities/ai-setting.entity';
import { DocumentAiResult } from './entities/document-ai-result.entity';

import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { DepartmentsModule } from './departments/departments.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { DocumentCategoriesModule } from './document-categories/document-categories.module';

@Module({
  imports: [
    LoggerModule,

    ConfigModule.forRoot({  
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({ 
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          Role,
          User,
          Department,
          DocumentType,
          DocumentCategory,
          Document,
          DocumentRoute,
          DocumentSource,       
          DocumentFile,         
          OcrResult,             
          DocumentClassification,
          AiSetting,
          DocumentAiResult,
        ],
        synchronize: false, 
        logging: ['error'],  
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    DashboardModule,
    DocumentsModule,
    DepartmentsModule,
    DocumentTypesModule,
    DocumentCategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
