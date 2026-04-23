import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); 

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          
    forbidNonWhitelisted: true,
    transform: true,           
    disableErrorMessages: false, 
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
