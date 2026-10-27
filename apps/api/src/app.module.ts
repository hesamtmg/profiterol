import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { config } from './config';
import { CustomBlocksModule } from './custom-blocks/custom-blocks.module';
import { dataSourceOptions } from './data-source';
import { DesignsModule } from './designs/designs.module';
import { FormsModule } from './forms/forms.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { RedirectsModule } from './redirects/redirects.module';
import { SeedService } from './seed.service';
import { SettingsModule } from './settings/settings.module';
import { AdminSitesController, InternalSitesController } from './sites/sites.controller';
import { SitesModule } from './sites/sites.module';
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
    SitesModule,
    UsersModule,
    AuthModule,
    PagesModule,
    RedirectsModule,
    CollectionsModule,
    SettingsModule,
    MediaModule,
    FormsModule,
    DesignsModule,
    AiModule,
    CustomBlocksModule,
  ],
  controllers: [HealthController, AdminSitesController, InternalSitesController],
  providers: [SeedService],
})
export class AppModule {}
