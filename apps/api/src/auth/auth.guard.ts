import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { csrfOk, readToken } from './session';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  /** The user's tokenVersion when the token was made; a newer version means the token was revoked. */
  ver?: number;
}

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles. Without it, any signed-in user may call the route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const found = readToken(req);
    if (!found) throw new UnauthorizedException();

    let claims: AuthUser;
    try {
      claims = await this.jwt.verifyAsync<AuthUser>(found.token);
    } catch {
      throw new UnauthorizedException();
    }
    if (found.fromCookie && !csrfOk(req)) throw new ForbiddenException('Missing or wrong security token. Reload the page and try again.');

    // Checked on every request, so deactivating a user or changing a password takes effect at once.
    const user = await this.users.findById(claims.sub);
    if (!user || !user.active || (claims.ver ?? 0) !== user.tokenVersion) throw new UnauthorizedException();
    // The role comes from the database, not the token, so a role change also applies at once.
    req.user = { sub: user.id, email: user.email, role: user.role, ver: user.tokenVersion };

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}
