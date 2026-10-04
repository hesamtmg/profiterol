import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { config } from './config';
import { dataSourceOptions } from './data-source';
import { FormsModule } from './forms/forms.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { SeedService } from './seed.service';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      // DB_SYNC=true builds tables straight from the entities (quick local experiments only).
      // Otherwise pending migrations run on startup.
      synchronize: config.dbSync,
      migrationsRun: !config.dbSync,
    }),
    UsersModule,
    AuthModule,
    PagesModule,
    CollectionsModule,
    SettingsModule,
    MediaModule,
    FormsModule,
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule {}
