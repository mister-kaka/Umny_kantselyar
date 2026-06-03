import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../entities/user.entity';
import { LoginHistory } from '../entities/login-history.entity';
import { LoginDto } from './dto/login.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { SecurityService } from '../security/security.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LoginHistory)
    private loginHistoryRepository: Repository<LoginHistory>,
    private jwtService: JwtService,
    private readonly logger: AppLoggerService,
    private readonly securityService: SecurityService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(req: any, loginDto: LoginDto) {
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
    const token = this.jwtService.sign(payload);

    const ipAddress = this.getRequestIp(req);
    const userAgent = this.getRequestUserAgent(req);

    await this.securityService.saveSession(user.id, token, ipAddress || undefined, userAgent || undefined);

    await this.loginHistoryRepository.save({
      userId: user.id,
      ipAddress,
      userAgent,
      loginTime: new Date(),
    });

    await this.auditLogService.log(
      user.id,
      'login',
      null,
      { ipAddress, userAgent, email: user.email }
    );

    return { access_token: token };
  }

  async getProfile(userId: number): Promise<ProfileResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role', 'department'],
      });

      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      await this.logger.log({
        module: 'Auth',
        type: 'GET',
        url: '/auth/profile',
        action: 'получение профиля',
        status: 'success',
        statusCode: 200,
        message: `Профиль пользователя ${user.email} получен`,
      });

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role?.name || 'Пользователь',
        department: user.department?.name || null,
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'Auth',
        type: 'GET',
        url: '/auth/profile',
        action: 'получение профиля',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при получении профиля',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role', 'department'],
      });

      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      const changes: Record<string, any> = {};

      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: dto.email },
        });
        if (existingUser) {
          throw new HttpException('Email уже используется', HttpStatus.CONFLICT);
        }
        changes.oldEmail = user.email;
        changes.newEmail = dto.email;
        user.email = dto.email;
      }

      if (dto.fullName && dto.fullName !== user.fullName) {
        changes.oldFullName = user.fullName;
        changes.newFullName = dto.fullName;
        user.fullName = dto.fullName;
      }

      await this.userRepository.save(user);

      if (Object.keys(changes).length > 0) {
        await this.auditLogService.log(
          userId,
          'profile_update',
          null,
          changes
        );
      }

      await this.logger.log({
        module: 'Auth',
        type: 'PUT',
        url: '/auth/profile',
        action: 'обновление профиля',
        status: 'success',
        statusCode: 200,
        message: `Профиль пользователя ${user.email} обновлён`,
      });

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role?.name || 'Пользователь',
        department: user.department?.name || null,
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'Auth',
        type: 'PUT',
        url: '/auth/profile',
        action: 'обновление профиля',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при обновлении профиля',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
      if (!isPasswordValid) {
        await this.logger.log({
          module: 'Auth',
          type: 'POST',
          url: '/auth/change-password',
          action: 'смена пароля',
          status: 'error',
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Неверный текущий пароль',
        });
        throw new HttpException('Неверный текущий пароль', HttpStatus.UNAUTHORIZED);
      }

      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
      user.passwordHash = hashedPassword;
      await this.userRepository.save(user);

      await this.auditLogService.log(
        userId,
        'password_change',
        null,
        { message: 'Пароль успешно изменён' }
      );

      await this.logger.log({
        module: 'Auth',
        type: 'POST',
        url: '/auth/change-password',
        action: 'смена пароля',
        status: 'success',
        statusCode: 200,
        message: `Пароль пользователя ${user.email} изменён`,
      });

      return { message: 'Пароль успешно изменён' };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'Auth',
        type: 'POST',
        url: '/auth/change-password',
        action: 'смена пароля',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при смене пароля',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadAvatar(userId: number, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    try {
      if (!file) {
        throw new HttpException('Файл не загружен', HttpStatus.BAD_REQUEST);
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new HttpException(
          'Неподдерживаемый формат. Используйте JPG, PNG или WEBP',
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      let oldAvatarUrl: string | null = null;

      if (user.avatarUrl) {
        oldAvatarUrl = user.avatarUrl;
        const oldAvatarPath = path.join(process.cwd(), user.avatarUrl);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
          await this.logger.log({
            module: 'Auth',
            type: 'DELETE',
            url: '/auth/avatar',
            action: 'удаление старого аватара',
            status: 'success',
            statusCode: 200,
            message: `Старый аватар пользователя ${user.email} удалён: ${user.avatarUrl}`,
          });
        }
      }

      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const extension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const avatarUrl = `/uploads/avatars/${fileName}`;
      user.avatarUrl = avatarUrl;
      await this.userRepository.save(user);

      await this.auditLogService.log(
        userId,
        'avatar_upload',
        null,
        { oldAvatarUrl, newAvatarUrl: avatarUrl, fileSize: file.size }
      );

      await this.logger.log({
        module: 'Auth',
        type: 'POST',
        url: '/auth/avatar',
        action: 'загрузка аватара',
        status: 'success',
        statusCode: 200,
        message: `Аватар пользователя ${user.email} загружен: ${avatarUrl}`,
      });

      return { avatarUrl };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logger.log({
        module: 'Auth',
        type: 'POST',
        url: '/auth/avatar',
        action: 'загрузка аватара',
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Ошибка сервера',
      });

      throw new HttpException(
        'Ошибка сервера при загрузке аватара',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getRequestIp(req: any): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }
    return req.ip || req.connection?.remoteAddress || null;
  }

  private getRequestUserAgent(req: any): string | null {
    return req.headers['user-agent'] || null;
  }
}