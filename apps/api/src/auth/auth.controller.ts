import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { RateLimiter } from '../common/rate-limit';
import { currentSite, currentSiteId } from '../sites/site-context';
import type { User } from '../users/user.entity';
import { LOCK_MINUTES, UsersService } from '../users/users.service';
import { AuthGuard, AuthUser } from './auth.guard';
import { clearSession, setSession } from './session';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
/** Per visitor address, whatever the email: slows down guessing across many accounts. */
const loginLimiter = new RateLimiter(20, 15 * 60 * 1000, 'Too many sign-in attempts. Please wait a few minutes and try again.');

/** One-time sign-in links already used (until they expire anyway), so each works once. */
const usedTickets = new Map<string, number>();

class SsoDto {
  @IsString()
  @MinLength(20)
  ticket: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Signs in. The admin (which sends `X-Session: cookie`) gets an httpOnly session cookie and no token in the body;
   * other clients get a bearer token.
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    loginLimiter.check(req.ip ?? 'unknown');
    const user = await this.users.findForLogin(dto.email);
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      // Same answer whether or not the password is right, so a locked account cannot be probed.
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw new ForbiddenException(`Too many wrong passwords. This account is locked for ${LOCK_MINUTES} minutes.`);
    }
    // Compare against a dummy hash when the user is missing so timing does not reveal which emails exist.
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) {
      if (user && !ok) await this.users.loginFailed(user);
      throw new UnauthorizedException('Wrong email or password');
    }
    await this.users.loginSucceeded(user);

    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role, ver: user.tokenVersion };
    const token = await this.jwt.signAsync(payload);
    if (req.headers['x-session'] === 'cookie') {
      setSession(req, res, token);
      return { user: publicUser(user) };
    }
    return { token, user: publicUser(user) };
  }

  /**
   * Spends a one-time link from Admin → Sites ("Open admin"): the owner gets a session on this site without typing
   * the password again. The link only works on the site it was made for, once, within a minute.
   */
  @Post('sso')
  @HttpCode(200)
  async sso(@Body() dto: SsoDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    loginLimiter.check(req.ip ?? 'unknown');
    let claims: { sub: string; site: string; purpose: string; ver: number; jti?: string; exp?: number };
    try {
      claims = await this.jwt.verifyAsync(dto.ticket);
    } catch {
      throw new UnauthorizedException('This link has expired. Open the site again from Admin → Sites.');
    }
    const now = Date.now();
    for (const [jti, exp] of usedTickets) if (exp < now) usedTickets.delete(jti);
    if (claims.purpose !== 'sso' || claims.site !== currentSiteId() || !claims.jti || usedTickets.has(claims.jti)) {
      throw new UnauthorizedException('This link has expired. Open the site again from Admin → Sites.');
    }
    usedTickets.set(claims.jti, (claims.exp ?? 0) * 1000);
    const user = await this.users.findById(claims.sub);
    if (!user || !user.active || user.role !== 'owner' || user.siteId !== null || user.tokenVersion !== claims.ver) {
      throw new UnauthorizedException();
    }
    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role, ver: user.tokenVersion };
    setSession(req, res, await this.jwt.signAsync(payload));
    return { user: publicUser(user) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    clearSession(req, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: { user: AuthUser }) {
    const user = await this.users.findById(req.user.sub);
    if (!user) throw new UnauthorizedException();
    const site = currentSite();
    return { ...publicUser(user), site: { id: site.id, name: site.name, primary: site.primary, printDesigner: site.printDesigner } };
  }
}
