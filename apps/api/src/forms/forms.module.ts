import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagesModule } from '../pages/pages.module';
import { SettingsModule } from '../settings/settings.module';
import { FormSubmission } from './form-submission.entity';
import { AdminFormsController, PublicFormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmission]), PagesModule, SettingsModule],
  controllers: [PublicFormsController, AdminFormsController],
  providers: [FormsService],
})
export class FormsModule {}
