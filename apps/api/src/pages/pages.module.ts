import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsModule } from '../collections/collections.module';
import { Page, PageTranslation } from './page.entity';
import { AdminPagesController, PublicPagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Page, PageTranslation]), CollectionsModule, SettingsModule],
  controllers: [PublicPagesController, AdminPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
