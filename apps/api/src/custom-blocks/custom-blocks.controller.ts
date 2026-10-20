import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { readFileSync } from 'node:fs';
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS, readAttachments } from '../ai/attachments';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { MAX_SOURCE } from './compile';
import type { CustomBlock } from './custom-block.entity';
import { type AiStep, CustomBlocksService, moduleUrl } from './custom-blocks.service';

type Authed = { user: AuthUser };

class PromptDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  prompt: string;

  /** Which of the admin's own AI models to ask; their default when left out. */
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}

class DraftDto {
  @IsObject()
  def: Record<string, unknown>;

  @IsString()
  @MaxLength(MAX_SOURCE)
  source: string;
}

/** Files attached to a builder request, kept in memory only while it is answered. */
const attachments = FilesInterceptor('files', MAX_ATTACHMENTS, { limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_ATTACHMENTS } });

/** What the builder shows. The compiled draft is included for the sandboxed preview. */
function view(b: CustomBlock) {
  return {
    id: b.id,
    type: b.type,
    status: b.status,
    label: (b.live ?? b.draft).def.label,
    icon: (b.live ?? b.draft).def.icon,
    draft: b.draft,
    live: b.live ? { hash: b.live.hash, url: moduleUrl(b.id, b.live.hash) } : null,
    changed: !b.live || b.live.hash !== b.draft.hash || JSON.stringify(b.live.def) !== JSON.stringify(b.draft.def),
    conversation: b.conversation.map(({ role, content, at, author, model, attachments }) => ({
      role,
      at,
      author,
      model,
      attachments,
      // The AI's turns are stored as its whole JSON answer; the builder shows its summary.
      text: role === 'assistant' ? summaryOf(content) : content,
    })),
    createdBy: b.createdBy,
    approvedBy: b.approvedBy,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function summaryOf(content: string) {
  try {
    return String(JSON.parse(content).summary ?? '');
  } catch {
    return '';
  }
}

/**
 * The AI block builder. Admins build and try blocks; only the owner can approve one for use, because an approved
 * block's code runs in the browser of everyone who opens the site or the editor.
 */
@Controller('admin/custom-blocks')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminCustomBlocksController {
  constructor(private readonly blocks: CustomBlocksService) {}

  @Get()
  async list() {
    return (await this.blocks.list()).map(view);
  }

  /**
   * A request started with "Prefer: respond-async" (see answer()): its block once ready, else what the AI has done so
   * far (for the builder's conversation), or the request's error.
   */
  @Get('jobs/:job')
  async job(@Param('job', ParseUUIDPipe) job: string, @Req() req: Authed) {
    const { block, startedAt, steps } = this.blocks.job(req.user.sub, job);
    return block ? { state: 'done', block: view(block), startedAt, steps } : { state: 'running', startedAt, steps };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.blocks.get(id));
  }

  /** JSON, or multipart with up to 5 attached pictures, PDFs or text files under "files". */
  @Post()
  @UseInterceptors(attachments)
  async generate(
    @Body() dto: PromptDto,
    @Req() req: Authed,
    @Headers('prefer') prefer: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attached = await readAttachments(files);
    return this.answer(prefer, res, req.user.sub, (report) =>
      this.blocks.generate(dto.prompt.trim(), { id: req.user.sub, email: req.user.email }, dto.connectionId, attached, report),
    );
  }

  @Post(':id/refine')
  @HttpCode(200)
  @UseInterceptors(attachments)
  async refine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromptDto,
    @Req() req: Authed,
    @Headers('prefer') prefer: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attached = await readAttachments(files);
    return this.answer(prefer, res, req.user.sub, (report) =>
      this.blocks.refine(id, dto.prompt.trim(), { id: req.user.sub, email: req.user.email }, dto.connectionId, attached, report),
    );
  }

  /**
   * The block once the AI is done, or, with "Prefer: respond-async" (what the builder sends), 202 and a job id right
   * away, to fetch from GET jobs/:job.
   */
  private async answer(
    prefer: string | undefined,
    res: Response,
    userId: string,
    work: (report?: (step: AiStep) => void) => Promise<CustomBlock>,
  ) {
    if (!/\brespond-async\b/i.test(prefer ?? '')) return view(await work());
    res.status(202);
    return { job: this.blocks.background(userId, work) };
  }

  @Put(':id/draft')
  async saveDraft(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DraftDto) {
    return view(await this.blocks.saveDraft(id, dto));
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Roles('owner')
  async approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: Authed) {
    return view(await this.blocks.approve(id, req.user.email));
  }

  @Post(':id/disable')
  @HttpCode(200)
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.blocks.setDisabled(id, true));
  }

  @Post(':id/enable')
  @HttpCode(200)
  @Roles('owner')
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.blocks.setDisabled(id, false));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blocks.remove(id);
  }
}

let vueRuntime = '';

/** Approved blocks' browser modules, and Vue for the builder's sandboxed preview frame (passed on by the admin). */
@Controller('public/custom-blocks')
export class PublicCustomBlocksController {
  constructor(private readonly blocks: CustomBlocksService) {}

  @Get('vue.js')
  @Header('Content-Type', 'text/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  vue() {
    vueRuntime ||= readFileSync(require.resolve('vue/dist/vue.runtime.esm-browser.prod.js'), 'utf8');
    return vueRuntime;
  }

  @Get(':id/:file')
  async module(@Param('id', ParseUUIDPipe) id: string, @Param('file') file: string, @Res() res: Response) {
    const hash = /^([0-9a-f]{12})\.js$/.exec(file)?.[1] ?? '';
    const code = await this.blocks.liveModule(id, hash);
    res
      .set({
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      })
      .send(code);
  }
}
