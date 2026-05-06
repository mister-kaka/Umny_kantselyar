import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly logger: AppLoggerService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const logBase = {
      module: 'Auth',
      type: 'POST',
      url: '/auth/login',
      action: 'попытка входа',
      email: email || 'пустой',
    };

    if (!email || email.trim() === '') {
      await this.logger.log({ ...logBase, status: 'error', statusCode: 400, message: 'Пустой email' });
      throw new HttpException('Email обязателен', HttpStatus.BAD_REQUEST);
    }

    if (!password || password.trim() === '') {
      await this.logger.log({ ...logBase, status: 'error', statusCode: 400, message: 'Пустой пароль' });
      throw new HttpException('Пароль обязателен', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      await this.logger.log({ ...logBase, status: 'error', statusCode: 401, message: 'Пользователь не найден' });
      throw new HttpException('Пользователь не найден', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logger.log({ ...logBase, status: 'error', statusCode: 401, message: 'Неверный пароль' });
      throw new HttpException('Неверный пароль', HttpStatus.UNAUTHORIZED);
    }

    await this.logger.log({ ...logBase, status: 'success', statusCode: 200, message: 'Успешный вход' });

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}