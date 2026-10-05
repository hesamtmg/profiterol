import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { MoreThan, Repository } from 'typeorm';
import { Role, User } from './user.entity';

export const LOCK_AFTER = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD = 8;
const RESET_HOURS = 2;
const INVITE_DAYS = 7;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  /** Returns the user with its password hash, for login only. */
  findForLogin(email: string) {
    return this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('LOWER(u.email) = LOWER(:email)', { email }).getOne();
  }

  findByEmail(email: string) {
    return this.users.createQueryBuilder('u').where('LOWER(u.email) = LOWER(:email)', { email }).getOne();
  }

  list() {
    return this.users.find({ order: { createdAt: 'ASC' } });
  }

  /** Records a wrong password; locks the account for 15 minutes after 5 in a row. */
  async loginFailed(user: User) {
    const failedLogins = user.failedLogins + 1;
    const lockedUntil = failedLogins >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil;
    await this.users.update(user.id, { failedLogins: failedLogins >= LOCK_AFTER ? 0 : failedLogins, lockedUntil });
  }

  async loginSucceeded(user: User) {
    await this.users.update(user.id, { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() });
  }

  count() {
    return this.users.count();
  }

  async create(email: string, password: string, role: Role, name = '') {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.users.save(this.users.create({ email: email.toLowerCase(), passwordHash, role, name }));
  }

  /** A new user with no usable password; they choose one through the returned invitation link secret. */
  async invite(email: string, role: Role, name: string) {
    if (await this.findByEmail(email)) throw new ConflictException('Someone with this email already has an account');
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const user = await this.users.save(this.users.create({ email: email.toLowerCase(), passwordHash, role, name }));
    return { user, secret: await this.newResetSecret(user.id, INVITE_DAYS * 24) };
  }

  /** Makes a one-time secret for a password link; only its hash is stored. Replaces any earlier link. */
  async newResetSecret(userId: string, hours = RESET_HOURS) {
    const secret = randomBytes(32).toString('base64url');
    await this.users.update(userId, { resetTokenHash: sha256(secret), resetExpires: new Date(Date.now() + hours * 3_600_000) });
    return secret;
  }

  /** Sets a new password from a link; the link then stops working and every session is signed out. */
  async resetPassword(secret: string, password: string) {
    const user = await this.users.findOne({ where: { resetTokenHash: sha256(secret), resetExpires: MoreThan(new Date()) } });
    if (!user || !user.active) throw new BadRequestException('This link has expired or was already used. Ask for a new one.');
    await this.setPassword(user, password);
    return user;
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id: userId }).getOne();
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) throw new BadRequestException('The current password is wrong');
    await this.setPassword(user, next);
    return this.users.findOneByOrFail({ id: userId });
  }

  private async setPassword(user: User, password: string) {
    if (password.length < MIN_PASSWORD) throw new BadRequestException(`Use at least ${MIN_PASSWORD} characters`);
    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(password, 12),
      resetTokenHash: null,
      resetExpires: null,
      failedLogins: 0,
      lockedUntil: null,
      tokenVersion: user.tokenVersion + 1,
    });
  }

  /** Name, role and active state. The last active admin cannot be demoted or deactivated. */
  async update(id: string, changes: { name?: string; role?: Role; active?: boolean }) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException();
    const losesAdmin = user.role === 'admin' && user.active && (changes.role === 'editor' || changes.active === false);
    if (losesAdmin && (await this.users.countBy({ role: 'admin', active: true })) <= 1) {
      throw new BadRequestException('There must always be at least one active admin');
    }
    await this.users.update(id, {
      ...changes,
      ...(changes.active === true ? { failedLogins: 0, lockedUntil: null } : {}),
      // Deactivating ends their open sessions. (A new role applies at once anyway: the guard reads it from here.)
      ...(changes.active === false ? { tokenVersion: user.tokenVersion + 1 } : {}),
    });
    return this.findById(id);
  }
}
