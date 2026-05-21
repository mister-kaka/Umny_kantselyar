import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); 

  app.use('/uploads', express.static(require('path').join(process.cwd(), 'uploads')));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          
    forbidNonWhitelisted: true,
    transform: true,           
    disableErrorMessages: false, 
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
