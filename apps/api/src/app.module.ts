import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { SeedService } from './seed.service';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.databaseUrl,
      autoLoadEntities: true,
      synchronize: config.dbSync,
    }),
    UsersModule,
    AuthModule,
    PagesModule,
    SettingsModule,
    MediaModule,
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule {}
