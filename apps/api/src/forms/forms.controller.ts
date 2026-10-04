import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { locales } from '@profiterol/blocks';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { FormsService } from './forms.service';
import { RateLimiter } from './rate-limit';

class SubmitDto {
  @IsIn(locales.map((l) => l.code))
  locale: string;

  /** One answer per form field, in order. */
  @IsArray()
  @ArrayMaxSize(20)
  values: unknown[];

  /** Hidden field that people never fill in; bots often do. */
  @IsOptional()
  @IsString()
  website?: string;

  /** When the form was shown (ms since epoch); messages sent within two seconds are treated as bots. */
  @IsOptional()
  @IsNumber()
  startedAt?: number;
}

class ReadDto {
  @IsBoolean()
  read: boolean;
}

const limiter = new RateLimiter(5, 10 * 60 * 1000);

@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly forms: FormsService) {}

  @Post(':pageId/:blockId')
  @HttpCode(200)
  async submit(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: SubmitDto,
    @Req() req: Request,
  ) {
    // Bots get a normal-looking reply so they do not learn to adapt.
    if (dto.website) return { ok: true };
    if (dto.startedAt && Date.now() - dto.startedAt < 2000) throw new BadRequestException('Please take a moment to fill in the form.');
    limiter.check(req.ip ?? 'unknown');
    return this.forms.submit(pageId, blockId.slice(0, 40), dto.locale, dto.values);
  }
}

@Controller('admin/submissions')
@UseGuards(AuthGuard)
export class AdminFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list() {
    return this.forms.list();
  }

  @Get('unread-count')
  async unread() {
    return { count: await this.forms.unreadCount() };
  }

  @Patch(':id')
  setRead(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReadDto) {
    return this.forms.setRead(id, dto.read);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.forms.remove(id);
  }
}
