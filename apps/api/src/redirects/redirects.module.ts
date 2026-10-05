import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { isSafeUrl } from '@profiterol/blocks';
import { AuthGuard } from '../auth/auth.guard';

/** An old address that now lives somewhere else, e.g. after moving from minicms. */
@Entity('redirects')
export class Redirect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The old path, e.g. /page/about-us (no domain, no query). */
  @Index({ unique: true })
  @Column({ length: 500 })
  from: string;

  /** Where it goes: a path on this site or a full https:// address. */
  @Column({ length: 1000 })
  to: string;

  /** 301 = moved for good (search engines update their links); 302 = for now. */
  @Column({ type: 'int', default: 301 })
  status: number;

  @Column({ type: 'int', default: 0 })
  hits: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastHitAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** /Page/About%20us/ → /page/about us: one spelling per address, so lookups match however it was typed. */
export function normalizePath(input: string): string {
  let path = input.trim();
  try {
    path = decodeURIComponent(new URL(path, 'http://x').pathname);
  } catch {
    // Not a valid address: keep it as typed, it will be refused below.
  }
  path = `/${path.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';
  return path.toLowerCase();
}

class RedirectDto {
  @IsString()
  @MaxLength(500)
  from: string;

  @IsString()
  @MaxLength(1000)
  to: string;

  @IsOptional()
  @IsIn([301, 302])
  status?: number;
}

class UpdateRedirectDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  to?: string;

  @IsOptional()
  @IsIn([301, 302])
  status?: number;
}

@Injectable()
export class RedirectsService {
  constructor(@InjectRepository(Redirect) private readonly repo: Repository<Redirect>) {}

  list() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  private checkTarget(to: string) {
    const target = to.trim();
    if (!target || (!target.startsWith('/') && !/^https?:\/\//i.test(target)) || !isSafeUrl(target)) {
      throw new BadRequestException('The new address must start with / or https://');
    }
    return target;
  }

  async create(dto: RedirectDto) {
    const from = normalizePath(dto.from);
    if (from === '/' || from.startsWith('/admin') || from.startsWith('/api') || from.startsWith('/_')) {
      throw new BadRequestException('This address cannot be redirected');
    }
    const to = this.checkTarget(dto.to);
    if (normalizePath(to) === from) throw new BadRequestException('An address cannot redirect to itself');
    if (await this.repo.existsBy({ from })) throw new ConflictException('There is already a redirect for this address');
    return this.repo.save(this.repo.create({ from, to, status: dto.status ?? 301 }));
  }

  /** Adds many at once, skipping old addresses that already have one. Used by the minicms import. */
  async createMany(list: RedirectDto[]) {
    let added = 0;
    for (const dto of list) {
      try {
        await this.create(dto);
        added++;
      } catch {
        // Duplicate or unusable: skip it.
      }
    }
    return { added, skipped: list.length - added };
  }

  async update(id: string, dto: UpdateRedirectDto) {
    const r = await this.repo.findOneBy({ id });
    if (!r) throw new NotFoundException();
    if (dto.to !== undefined) r.to = this.checkTarget(dto.to);
    if (dto.status !== undefined) r.status = dto.status;
    return this.repo.save(r);
  }

  async remove(id: string) {
    const r = await this.repo.findOneBy({ id });
    if (!r) throw new NotFoundException();
    await this.repo.remove(r);
  }

  /** For the site: where an old address goes, counting the visit. */
  async resolve(path: string) {
    const r = await this.repo.findOneBy({ from: normalizePath(path) });
    if (!r) return null;
    await this.repo.update(r.id, { hits: () => 'hits + 1', lastHitAt: new Date() });
    return { to: r.to, status: r.status };
  }
}

@Controller('admin/redirects')
@UseGuards(AuthGuard)
export class AdminRedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  @Get()
  list() {
    return this.redirects.list();
  }

  @Post()
  create(@Body() dto: RedirectDto) {
    return this.redirects.create(dto);
  }

  @Post('bulk')
  @HttpCode(200)
  bulk(@Body() body: { redirects?: RedirectDto[] }) {
    if (!Array.isArray(body?.redirects) || body.redirects.length > 2000) throw new BadRequestException('Send up to 2000 redirects');
    return this.redirects.createMany(
      body.redirects.map((r) => ({ from: String(r.from ?? ''), to: String(r.to ?? ''), status: r.status === 302 ? 302 : 301 })),
    );
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRedirectDto) {
    return this.redirects.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.redirects.remove(id);
  }
}

@Controller('public/redirect')
export class PublicRedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  /** The web app asks this for addresses it has no page for. */
  @Get()
  async resolve(@Query('path') path = '') {
    const found = await this.redirects.resolve(path);
    if (!found) throw new NotFoundException();
    return found;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Redirect])],
  controllers: [AdminRedirectsController, PublicRedirectsController],
  providers: [RedirectsService],
})
export class RedirectsModule {}
