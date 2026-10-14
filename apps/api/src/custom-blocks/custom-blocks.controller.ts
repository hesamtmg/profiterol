import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { readFileSync } from 'node:fs';
import { AuthGuard, type AuthUser, Roles } from '../auth/auth.guard';
import { MAX_SOURCE } from './compile';
import type { CustomBlock } from './custom-block.entity';
import { CustomBlocksService, moduleUrl } from './custom-blocks.service';

type Authed = { user: AuthUser };

class PromptDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  prompt: string;
}

class DraftDto {
  @IsObject()
  def: Record<string, unknown>;

  @IsString()
  @MaxLength(MAX_SOURCE)
  source: string;
}

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
    conversation: b.conversation.map(({ role, content, at, author }) => ({
      role,
      at,
      author,
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

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return view(await this.blocks.get(id));
  }

  @Post()
  async generate(@Body() dto: PromptDto, @Req() req: Authed) {
    return view(await this.blocks.generate(dto.prompt.trim(), req.user.email));
  }

  @Post(':id/refine')
  @HttpCode(200)
  async refine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PromptDto, @Req() req: Authed) {
    return view(await this.blocks.refine(id, dto.prompt.trim(), req.user.email));
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
