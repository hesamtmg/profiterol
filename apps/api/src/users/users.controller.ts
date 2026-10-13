import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { canSendMail, sendMail } from '../common/mail';
import { RateLimiter } from '../common/rate-limit';
import { siteOrigin } from '../sites/site-context';
import type { Role, User } from './user.entity';
import { UsersService } from './users.service';

const ROLES: Role[] = ['admin', 'editor'];
const forgotLimiter = new RateLimiter(5, 60 * 60 * 1000, 'Too many requests. Please try again later.');

export const userView = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  active: u.active,
  locked: !!u.lockedUntil && u.lockedUntil > new Date(),
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

/**
 * Links in emails point at the site's own main address, from its settings, never at the request's Host header:
 * that would let someone send a victim a link to their own server.
 */
const resetLink = (base: string, secret: string) => `${base}/admin/reset?token=${secret}`;

class InviteDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsIn(ROLES)
  role: Role;
}

class UpdateUserDto {
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsIn(ROLES)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

class ForgotDto {
  @IsEmail()
  email: string;
}

class ResetDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

class ChangePasswordDto {
  @IsString()
  current: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

@Controller('admin/users')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list() {
    return (await this.users.list()).map(userView);
  }

  /** Creates the account and returns the invitation link (also emailed when email is set up). */
  @Post()
  async invite(@Body() dto: InviteDto) {
    const { user, secret } = await this.users.invite(dto.email, dto.role, dto.name ?? '');
    const link = resetLink(siteOrigin(), secret);
    const emailed = await sendMail({
      to: user.email,
      subject: 'You are invited to edit the website',
      text: `Hello${user.name ? ` ${user.name}` : ''},\n\nYou have been given an account to edit the website. Choose your password here (the link works for 7 days):\n\n${link}\n`,
    }).catch(() => false);
    return { user: userView(user), link, emailed };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @Req() req: { user: AuthUser }) {
    if (id === req.user.sub && (dto.active === false || dto.role === 'editor')) {
      throw new BadRequestException('You cannot deactivate yourself or remove your own admin role');
    }
    return userView((await this.users.update(id, dto))!);
  }

  /** A fresh password link for someone who forgot theirs, to pass on by hand. Valid for 2 hours. */
  @Post(':id/reset-link')
  async resetLinkFor(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.users.getSiteUser(id);
    return { link: resetLink(siteOrigin(), await this.users.newResetSecret(user.id)) };
  }
}

@Controller('auth')
export class PasswordController {
  constructor(private readonly users: UsersService) {}

  /**
   * Emails a reset link if the address belongs to an active user of this site (or an owner). The answer is the same
   * either way, so it cannot be used to find out who has an account.
   */
  @Post('forgot')
  @HttpCode(204)
  async forgot(@Body() dto: ForgotDto, @Req() req: Request) {
    forgotLimiter.check(req.ip ?? 'unknown');
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.active || !canSendMail()) return;
    const link = resetLink(siteOrigin(), await this.users.newResetSecret(user.id));
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      text: `Someone (hopefully you) asked to reset the password for ${user.email}.\n\nChoose a new password here (the link works for 2 hours):\n\n${link}\n\nIf it was not you, ignore this email; your password stays the same.\n`,
    }).catch(() => undefined);
  }

  /** Whether "Forgot password?" can work on this installation. */
  @Get('forgot')
  forgotAvailable() {
    return { available: canSendMail() };
  }

  @Post('reset')
  @HttpCode(204)
  async reset(@Body() dto: ResetDto) {
    await this.users.resetPassword(dto.token, dto.password);
  }

  @Post('password')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async change(@Body() dto: ChangePasswordDto, @Req() req: { user: AuthUser }) {
    if (dto.current === dto.password) throw new ForbiddenException('Choose a password different from the current one');
    await this.users.changePassword(req.user.sub, dto.current, dto.password);
  }
}
