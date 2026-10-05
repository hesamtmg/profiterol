import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
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
import { hasVariants, makeVariants, RESIZABLE_EXT, removeVariants } from './image-variants';
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
/** Browsers send all sorts of MIME types for fonts (often none), so fonts are recognised by extension. */
const FONTS: Record<string, string> = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };

/** The stored extension for an upload, or undefined when the type is not allowed. */
function extensionFor(file: { originalname: string; mimetype: string }): string | undefined {
  const ext = extname(file.originalname).toLowerCase();
  return FONTS[ext] ? ext : ALLOWED[file.mimetype];
}

const ascii = (b: Buffer, from: number, text: string) => b.subarray(from, from + text.length).toString('latin1') === text;

/** Checks the file's first bytes, so a renamed file (e.g. a script called photo.jpg) is refused. */
export function looksLike(ext: string, head: Buffer): boolean {
  switch (ext) {
    case '.jpg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case '.png':
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.gif':
      return ascii(head, 0, 'GIF87a') || ascii(head, 0, 'GIF89a');
    case '.webp':
      return ascii(head, 0, 'RIFF') && ascii(head, 8, 'WEBP');
    case '.avif':
      return ascii(head, 4, 'ftyp') && (ascii(head, 8, 'avif') || ascii(head, 8, 'avis'));
    case '.mp4':
      return ascii(head, 4, 'ftyp');
    case '.webm':
      return head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case '.woff2':
      return ascii(head, 0, 'wOF2');
    case '.woff':
      return ascii(head, 0, 'wOFF');
    case '.ttf':
      return head.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])) || ascii(head, 0, 'true');
    case '.otf':
      return ascii(head, 0, 'OTTO');
    default:
      return false;
  }
}

async function readHead(path: string): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}
const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class MediaService implements OnApplicationBootstrap {
  private readonly log = new Logger(MediaService.name);

  constructor(@InjectRepository(Media) private readonly repo: Repository<Media>) {}

  /** Photos uploaded before resizing existed get their copies in the background after start-up. */
  onApplicationBootstrap() {
    setTimeout(() => this.backfill().catch((err) => this.log.warn(`Could not resize older photos: ${err}`)), 2000);
  }

  async backfill() {
    let done = 0;
    for (const m of await this.repo.find()) {
      if (!RESIZABLE_EXT.test(m.filename)) continue;
      if (m.width && (await hasVariants(config.uploadDir, m.filename))) continue;
      try {
        const size = await makeVariants(config.uploadDir, m.filename);
        await this.repo.update(m.id, size);
        done++;
      } catch (err) {
        this.log.warn(`Could not resize ${m.filename}: ${err}`);
      }
    }
    if (done) this.log.log(`Made web sizes for ${done} older photo(s)`);
    return done;
  }

  list() {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  async add(file: Express.Multer.File) {
    const ext = extname(file.filename);
    if (!looksLike(ext, await readHead(file.path))) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('The file’s contents do not match its type');
    }
    let size: { width: number; height: number } | null = null;
    if (RESIZABLE_EXT.test(file.filename)) {
      try {
        size = await makeVariants(config.uploadDir, file.filename);
      } catch {
        // Passed the first-bytes check but cannot be decoded: refuse it rather than serve a broken photo.
        await removeVariants(config.uploadDir, file.filename);
        await unlink(file.path).catch(() => undefined);
        throw new BadRequestException('This picture could not be read');
      }
    }
    return this.repo.save(
      this.repo.create({
        filename: file.filename,
        originalName: file.originalname.slice(0, 255),
        mime: FONTS[ext] ?? file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        width: size?.width ?? null,
        height: size?.height ?? null,
      }),
    );
  }

  async remove(id: string) {
    const media = await this.repo.findOneBy({ id });
    if (!media) throw new NotFoundException();
    await this.repo.remove(media);
    await unlink(join(config.uploadDir, media.filename)).catch(() => undefined);
    await removeVariants(config.uploadDir, media.filename);
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
        extensionFor(file)
          ? cb(null, true)
          : cb(new BadRequestException('Only JPG, PNG, WebP, GIF, AVIF, MP4, WebM and font (WOFF2, WOFF, TTF, OTF) files are allowed'), false),
      // Files get a random name; the original name is only kept in the database.
      storage: diskStorage({
        destination: config.uploadDir,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extensionFor(file)}`),
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
