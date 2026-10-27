import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { locales } from '@profiterol/blocks';
import { IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { RateLimiter } from '../common/rate-limit';
import { designStatuses, type DesignStatus } from './design-request.entity';
import { type DesignAnswers, DesignsService, type UploadedPicture } from './designs.service';

/** Sent as multipart form data: these fields, plus the `preview` and `print` pictures. */
class SubmitDesignDto {
  @IsIn(locales.map((l) => l.code))
  locale: string;

  /** The answers as JSON (see DesignAnswers). */
  @IsString()
  @MaxLength(30000)
  data: string;

  /** Hidden field that people never fill in; bots often do. */
  @IsOptional()
  @IsString()
  website?: string;

  /** When the designer was shown (ms since epoch). */
  @IsOptional()
  @IsNumberString()
  startedAt?: string;
}

class UpdateDesignDto {
  @IsOptional()
  @IsIn(designStatuses)
  status?: DesignStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNote?: string;
}

/** nginx accepts up to 25 MB per request, so the print file must stay below that. */
const MAX_PRINT_BYTES = 22 * 1024 * 1024;
const limiter = new RateLimiter(4, 10 * 60 * 1000, 'Too many designs. Please try again in a few minutes.');

@Controller('public/designs')
export class PublicDesignsController {
  constructor(private readonly designs: DesignsService) {}

  @Post(':pageId/:blockId')
  @HttpCode(200)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'preview', maxCount: 1 },
        { name: 'print', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: MAX_PRINT_BYTES, files: 2, fields: 6, fieldSize: 40000 } },
    ),
  )
  async submit(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: SubmitDesignDto,
    @UploadedFiles() files: { preview?: UploadedPicture[]; print?: UploadedPicture[] } = {},
    @Req() req: Request,
    @Headers('x-visitor-key') visitor?: string,
  ) {
    // Bots get a normal-looking reply so they do not learn to adapt.
    if (dto.website) return { ok: true };
    if (dto.startedAt && Date.now() - Number(dto.startedAt) < 5000) throw new BadRequestException('Please take a moment to design.');
    let answers: DesignAnswers;
    try {
      answers = JSON.parse(dto.data) as DesignAnswers;
    } catch {
      throw new BadRequestException('The design could not be read. Please try again.');
    }
    if (!answers || typeof answers !== 'object') throw new BadRequestException('The design could not be read. Please try again.');
    limiter.check(req.ip ?? 'unknown');
    return this.designs.submit(
      pageId,
      blockId.slice(0, 40),
      dto.locale,
      answers,
      {
        preview: files.preview?.[0],
        print: files.print?.[0],
      },
      visitor,
    );
  }

  /** The designs this browser sent (the key it keeps comes in the X-Visitor-Key header), and the limit. */
  @Get(':pageId/:blockId/mine')
  mine(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('blockId') blockId: string,
    @Query('locale') locale: string | undefined,
    @Headers('x-visitor-key') visitor: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set('Cache-Control', 'private, no-store');
    const lang = locales.some((l) => l.code === locale) ? locale! : locales[0].code;
    return this.designs.mine(pageId, blockId.slice(0, 40), lang, visitor ?? '');
  }

  /** The preview of one of this browser's own designs. */
  @Get('mine/:id/preview')
  async myPreview(@Param('id', ParseUUIDPipe) id: string, @Headers('x-visitor-key') visitor: string | undefined, @Res() res: Response) {
    const file = await this.designs.myPreview(id, visitor ?? '');
    res.set({ 'Content-Type': file.type, 'Content-Length': String(file.data.length), 'Cache-Control': 'private, no-store' });
    res.end(file.data);
  }
}

@Controller('admin/designs')
@UseGuards(AuthGuard)
export class AdminDesignsController {
  constructor(private readonly designs: DesignsService) {}

  @Get()
  list() {
    return this.designs.list();
  }

  @Get('new-count')
  async newCount() {
    return { count: await this.designs.newCount() };
  }

  /** The product with the design on it, shown in the admin. */
  @Get(':id/preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    return this.send(id, 'preview', false, res);
  }

  /** The print file; `?download=1` saves it. */
  @Get(':id/print')
  print(@Param('id', ParseUUIDPipe) id: string, @Query('download') download: string | undefined, @Res() res: Response) {
    return this.send(id, 'print', Boolean(download), res);
  }

  private async send(id: string, which: 'preview' | 'print', download: boolean, res: Response) {
    const file = await this.designs.file(id, which);
    res.set({
      'Content-Type': file.type,
      'Content-Length': String(file.data.length),
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${which}-${id.slice(0, 8)}${file.ext}"`,
    });
    res.end(file.data);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDesignDto) {
    return this.designs.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.designs.remove(id);
  }
}
