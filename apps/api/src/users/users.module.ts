import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AdminUsersController, PasswordController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminUsersController, PasswordController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
