import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentCategory } from './entities/document-category.entity';
import { Document } from './entities/document.entity';
import { DocumentRoute } from './entities/document-route.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({  //Загрузка переменных из .env
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({  //Подключение TypeORM к PostgreSQL
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
        ],
        synchronize: false, 
        logging: true,   
      }),
      inject: [ConfigService],
    }),

    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
