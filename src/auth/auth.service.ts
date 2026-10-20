import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { password, ...rest } = dto;
    const user = await this.users.create({
      ...rest,
      passwordHash: await bcrypt.hash(password, 10),
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.session(user);
  }

  private session(user: UserDocument) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, alias: user.alias }),
      user: UsersService.toPrivate(user),
    };
  }
}
