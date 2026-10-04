import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { config } from '../config';
import { Media } from './media.entity';

/** Allowed upload types. SVG is excluded because it can carry scripts. */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};
const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(@InjectRepository(Media) private readonly repo: Repository<Media>) {}

  list() {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  add(file: Express.Multer.File) {
    return this.repo.save(
      this.repo.create({
        filename: file.filename,
        originalName: file.originalname.slice(0, 255),
        mime: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      }),
    );
  }

  async remove(id: string) {
    const media = await this.repo.findOneBy({ id });
    if (!media) throw new NotFoundException();
    await this.repo.remove(media);
    await unlink(join(config.uploadDir, media.filename)).catch(() => undefined);
  }
}

@Controller('admin/media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list() {
    return this.media.list();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES, files: 1 },
      fileFilter: (_req, file, cb) =>
        ALLOWED[file.mimetype]
          ? cb(null, true)
          : cb(new BadRequestException('Only JPG, PNG, WebP, GIF, AVIF, MP4 and WebM files are allowed'), false),
      // Files get a random name; the original name is only kept in the database.
      storage: diskStorage({
        destination: config.uploadDir,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${ALLOWED[file.mimetype]}`),
      }),
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file sent');
    return this.media.add(file);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.remove(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
