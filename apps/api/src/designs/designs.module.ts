import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagesModule } from '../pages/pages.module';
import { SettingsModule } from '../settings/settings.module';
import { DesignRequest } from './design-request.entity';
import { AdminDesignsController, PublicDesignsController } from './designs.controller';
import { DesignsService } from './designs.service';

@Module({
  imports: [TypeOrmModule.forFeature([DesignRequest]), PagesModule, SettingsModule],
  controllers: [PublicDesignsController, AdminDesignsController],
  providers: [DesignsService],
})
export class DesignsModule {}
