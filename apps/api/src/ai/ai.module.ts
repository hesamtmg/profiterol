import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsModule } from '../settings/settings.module';
import { SiteSettings } from '../settings/settings.entity';
import { AiSettingsController, AiSettingsService } from './ai-settings';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSettings]), SettingsModule],
  controllers: [AiSettingsController],
  providers: [AiSettingsService],
  exports: [AiSettingsService],
})
export class AiModule {}
