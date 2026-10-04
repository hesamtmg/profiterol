import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UsersService } from '../users/users.service';
import { AuthGuard, AuthUser } from './auth.guard';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findForLogin(dto.email);
    // Compare against a dummy hash when the user is missing so timing does not reveal which emails exist.
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) throw new UnauthorizedException('Wrong email or password');

    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role };
    return {
      token: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: { user: AuthUser }) {
    const user = await this.users.findById(req.user.sub);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
