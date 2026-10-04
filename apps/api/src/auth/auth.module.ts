import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.register({ secret: config.jwtSecret, signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
