import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  type: string;
  url: string;
  action: string;
  email?: string;
  password?: string;  
  status: string;
  errorCode?: number;
  errorMessage?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private getMoscowTime(): string {
    return new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

  private writeLog(logEntry: LogEntry) { 
    const logFilePath = path.join(__dirname, '../../logs.json');
    let logs: LogEntry[] = []; 
    
    if (fs.existsSync(logFilePath)) {
      try {
        const fileContent = fs.readFileSync(logFilePath, 'utf8');
        logs = JSON.parse(fileContent);
      } catch (e) {
        logs = [];
      }
    }
    logs.push(logEntry);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const timestamp = this.getMoscowTime();

     if (!email || email.trim() === '') {
      this.writeLog({
        timestamp,
        type: 'POST',
        url: '/auth/login',
        action: 'попытка входа',
        email: 'пустой',
        password: '***',
        status: 'error',
        errorCode: 400,
        errorMessage: 'Пустой email',
      });
      throw new HttpException('Email обязателен', HttpStatus.BAD_REQUEST);
    }


    if (!password || password.trim() === '') {
      this.writeLog({
        timestamp,
        type: 'POST',
        url: '/auth/login',
        action: 'попытка входа',
        email,
        password: '***',
        status: 'error',
        errorCode: 400,
        errorMessage: 'Пустой пароль',
      });
      throw new HttpException('Пароль обязателен', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({
      where: { email },
    });

    
    if (!user) {
      this.writeLog({
        timestamp,
        type: 'POST',
        url: '/auth/login',
        action: 'попытка входа',
        email,
        password: '***',
        status: 'error',
        errorCode: 401,
        errorMessage: 'Пользователь не найден',
      });
      throw new HttpException('Пользователь не найден', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.writeLog({
        timestamp,
        type: 'POST',
        url: '/auth/login',
        action: 'попытка входа',
        email,
        password: '***',
        status: 'error',
        errorCode: 401,
        errorMessage: 'Неверный пароль',
      });
      throw new HttpException('Неверный пароль', HttpStatus.UNAUTHORIZED);
    }
  
    this.writeLog({
      timestamp,
      type: 'POST',
      url: '/auth/login',
      action: 'попытка входа',
      email,
      password: '***',
      status: 'success',
      errorCode: 200,
      errorMessage: 'Успешный вход',
    });

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}