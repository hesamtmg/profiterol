import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionsController, SettingsController, SettingsService } from './settings.controller';
import { SiteSettings } from './settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSettings])],
  controllers: [SettingsController, SectionsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
