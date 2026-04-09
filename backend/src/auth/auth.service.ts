import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.UNAUTHORIZED);
    }

    if (user.passwordHash !== password) {
      throw new HttpException('Неверный пароль', HttpStatus.UNAUTHORIZED);
    }

    return {
      access_token: 'fake-jwt-token',
    };
  }
}
