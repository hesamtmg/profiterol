import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  imports: [UsersModule, JwtModule.register({ secret: config.jwtSecret, signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController],
  providers: [AuthGuard],
  // UsersModule is re-exported so AuthGuard (used in every module) can check the user on each request.
  exports: [AuthGuard, JwtModule, UsersModule],
})
export class AuthModule {}
