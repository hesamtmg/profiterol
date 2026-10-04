import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role, User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  /** Returns the user with its password hash, for login only. */
  findForLogin(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  count() {
    return this.users.count();
  }

  async create(email: string, password: string, role: Role, name = '') {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.users.save(this.users.create({ email: email.toLowerCase(), passwordHash, role, name }));
  }
}
