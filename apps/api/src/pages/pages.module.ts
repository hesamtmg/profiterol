import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsModule } from '../collections/collections.module';
import { MediaModule } from '../media/media.module';
import { Page, PageRevision, PageTranslation } from './page.entity';
import { AdminPagesController, PublicPagesController, SiteTemplatesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Page, PageTranslation, PageRevision]), CollectionsModule, SettingsModule, MediaModule],
  controllers: [PublicPagesController, AdminPagesController, SiteTemplatesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
