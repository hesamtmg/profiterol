import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { designBlockTypes, printSurfaces, withDefaults } from '@profiterol/blocks';
import { Brackets, Not, Repository } from 'typeorm';
import { canSendMail, sendMail } from '../common/mail';
import { EMAIL, PHONE, choices } from '../forms/forms.service';
import { looksLike } from '../media/media.module';
import { PagesService } from '../pages/pages.service';
import { SettingsService } from '../settings/settings.controller';
import { currentSiteId } from '../sites/site-context';
import { DesignDetails, DesignRequest, DesignStatus } from './design-request.entity';

interface DesignerProduct {
  surface: string;
  name: string;
  sizes: string;
}

interface DesignerProps {
  title: string;
  products: DesignerProduct[];
  colors: string;
  materials: string;
  maxQuantity: number;
  maxDesigns: number;
  maxPhotos: number;
  showMyDesigns: boolean;
  successMessage: string;
}

/** What the visitor's browser sends beside the two pictures (the `data` field, as JSON). */
export interface DesignAnswers {
  product: number;
  color?: string;
  material?: string;
  size?: string;
  quantity?: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  printPx?: [number, number];
  layers?: string[];
  background?: string;
}

export interface UploadedPicture {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Picture types the designer may send, with the extension `looksLike` checks them as. */
const PICTURES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const messages = {
  en: {
    changed: 'The designer has changed. Reload the page and try again.',
    check: 'Please check the form',
    name: 'Please write your name.',
    phone: 'Please write a phone number we can call you back on.',
    email: 'The email address is not valid.',
    quantity: 'The quantity is not valid.',
    picture: 'The design could not be read. Please try again.',
    photos: 'A design can have up to {n} photo(s).',
    limit: 'You have already sent {n} designs, the most we take from one person. We will call you about them.',
  },
  fa: {
    changed: 'طراح تغییر کرده است. صفحه را دوباره بارگذاری کنید.',
    check: 'لطفا فرم را بررسی کنید',
    name: 'لطفا نامتان را بنویسید.',
    phone: 'لطفا شماره‌ای بنویسید که با شما تماس بگیریم.',
    email: 'ایمیل معتبر نیست.',
    quantity: 'تعداد معتبر نیست.',
    picture: 'طرح خوانده نشد. دوباره تلاش کنید.',
    photos: 'هر طرح حداکثر {n} عکس دارد.',
    limit: 'شما {n} طرح فرستاده‌اید که بیشترین تعداد برای هر نفر است. درباره‌ی آن‌ها با شما تماس می‌گیریم.',
  },
};

/** A limit set on the block: 0 or empty means none. Blocks saved before the setting existed get its default. */
export function limitOf(value: unknown, fallback: number): number {
  const n = value === undefined || value === null || value === '' ? fallback : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** The last ten digits of a phone number, with Persian and Arabic digits made Latin: 0912…, +98912… and ۰۹۱۲… match. */
export function phoneKey(phone: string): string {
  return phone
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '')
    .slice(-10);
}

/** The browser's key is a random string of 32–64 letters and digits; only its hash is stored and compared. */
export function visitorHash(key: unknown): string {
  return typeof key === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(key) ? createHash('sha256').update(key).digest('hex') : '';
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Checks the answers against the block as published, returning what is stored. Throws with readable messages. */
export function checkDesign(props: DesignerProps, answers: DesignAnswers, locale = 'en') {
  const m = messages[locale as keyof typeof messages] ?? messages.en;
  const product = Number.isInteger(answers.product) ? props.products?.[answers.product] : undefined;
  const surface = printSurfaces.find((s) => s.key === product?.surface);
  if (!product || !surface) throw new BadRequestException(m.changed);

  const color = text(answers.color, 16).toLowerCase();
  const material = text(answers.material, 80);
  const size = text(answers.size, 40);
  const colors = choices(props.colors ?? '').map((c) => c.toLowerCase());
  const materials = choices(props.materials ?? '');
  const sizes = choices(product.sizes ?? '');
  if ((color || colors.length) && !colors.includes(color)) throw new BadRequestException(m.changed);
  if ((material || materials.length) && !materials.includes(material)) throw new BadRequestException(m.changed);
  if ((size || sizes.length) && !sizes.includes(size)) throw new BadRequestException(m.changed);

  const errors: string[] = [];
  const name = text(answers.name, 120);
  const phone = text(answers.phone, 40);
  const email = text(answers.email, 200);
  const max = Math.max(1, Number(props.maxQuantity) || 500);
  const quantity = Number(answers.quantity ?? 1);
  if (!name) errors.push(m.name);
  if (!PHONE.test(phone)) errors.push(m.phone);
  if (email && !EMAIL.test(email)) errors.push(m.email);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) errors.push(m.quantity);
  const photos = (Array.isArray(answers.layers) ? answers.layers : []).filter(
    (l) => typeof l === 'string' && l.startsWith('Photo:'),
  ).length;
  const maxPhotos = limitOf(props.maxPhotos, 10);
  if (maxPhotos && photos > maxPhotos) errors.push(m.photos.replace('{n}', String(maxPhotos)));
  if (errors.length) throw new BadRequestException({ message: m.check, errors });

  const px = Array.isArray(answers.printPx) ? answers.printPx.map((n) => Math.max(0, Math.round(Number(n) || 0))) : [0, 0];
  const details: DesignDetails = {
    printCm: surface.printCm,
    printPx: [px[0] ?? 0, px[1] ?? 0],
    layers: (Array.isArray(answers.layers) ? answers.layers : []).slice(0, 40).map((l) => text(l, 300)),
    background: text(answers.background, 120),
  };
  return {
    product: text(product.name, 120) || surface.label,
    surface: surface.key,
    color,
    material,
    size,
    quantity,
    name,
    phone,
    email,
    notes: text(answers.notes, 3000),
    details,
  };
}

/** Refuses a picture whose type is not allowed or whose first bytes do not match it. */
function checkPicture(file: UploadedPicture | undefined, locale: string): UploadedPicture {
  const ext = file && PICTURES[file.mimetype];
  if (!file || !ext || !looksLike(ext, file.buffer.subarray(0, 16))) {
    throw new BadRequestException((messages[locale as keyof typeof messages] ?? messages.en).picture);
  }
  return file;
}

const LIST_COLUMNS: (keyof DesignRequest)[] = [
  'id',
  'pageId',
  'pageTitle',
  'locale',
  'status',
  'name',
  'phone',
  'email',
  'notes',
  'product',
  'surface',
  'color',
  'material',
  'size',
  'quantity',
  'details',
  'adminNote',
  'previewType',
  'printType',
  'printBytes',
  'createdAt',
  'updatedAt',
];

@Injectable()
export class DesignsService {
  private readonly log = new Logger(DesignsService.name);

  constructor(
    @InjectRepository(DesignRequest) private readonly designs: Repository<DesignRequest>,
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
  ) {}

  async submit(
    pageId: string,
    blockId: string,
    locale: string,
    answers: DesignAnswers,
    files: { preview?: UploadedPicture; print?: UploadedPicture },
    visitor?: string,
  ) {
    const props = await this.designer(pageId, locale, blockId);
    const checked = checkDesign(props, answers, locale);
    const visitorKey = visitorHash(visitor);
    const keys = { phoneKey: phoneKey(checked.phone), visitorKey };
    const max = limitOf(props.maxDesigns, 5);
    if (max && (await this.sentBy(pageId, blockId, keys)) >= max) {
      const m = messages[locale as keyof typeof messages] ?? messages.en;
      throw new BadRequestException({ message: m.limit.replace('{n}', String(max)), limit: max });
    }
    const preview = checkPicture(files.preview, locale);
    const print = checkPicture(files.print, locale);

    const page = await this.pages.get(pageId);
    const pageTitle = page.translations.find((t) => t.locale === locale)?.title ?? page.name;
    const saved = await this.designs.save(
      this.designs.create({
        ...checked,
        ...keys,
        siteId: currentSiteId(),
        pageId,
        pageTitle,
        blockId,
        locale,
        preview: preview.buffer,
        previewType: preview.mimetype,
        printFile: print.buffer,
        printType: print.mimetype,
        printBytes: print.size,
      }),
    );
    this.notify(saved).catch((err) => this.log.warn(`Could not email the design: ${err}`));
    return { ok: true, id: saved.id, message: props.successMessage };
  }

  /** The designer block's settings as visitors see them, or 404. */
  private async designer(pageId: string, locale: string, blockId: string): Promise<DesignerProps> {
    const block = await this.pages.findPublishedBlock(pageId, locale, blockId);
    if (!block || !designBlockTypes.includes(block.type)) throw new NotFoundException('Designer not found');
    return withDefaults(block) as unknown as DesignerProps;
  }

  /** How many designs (not cancelled) this browser or this phone number has sent through one designer. */
  private sentBy(pageId: string, blockId: string, keys: { phoneKey: string; visitorKey: string }) {
    return this.designs
      .createQueryBuilder('d')
      .where('d.siteId = :siteId AND d.pageId = :pageId AND d.blockId = :blockId', { siteId: currentSiteId(), pageId, blockId })
      .andWhere("d.status <> 'cancelled'")
      .andWhere(
        new Brackets((q) => {
          q.where('d.phoneKey = :phoneKey', { phoneKey: keys.phoneKey || '-' });
          if (keys.visitorKey) q.orWhere('d.visitorKey = :visitorKey', { visitorKey: keys.visitorKey });
        }),
      )
      .getCount();
  }

  /**
   * The designs this browser sent on this site, newest first, for the visitor's "My designs" tab, with how many of
   * the designer's limit are used. Nothing private beyond what the visitor typed themselves.
   */
  async mine(pageId: string, blockId: string, locale: string, visitor: string) {
    const props = await this.designer(pageId, locale, blockId);
    const visitorKey = visitorHash(visitor);
    const max = limitOf(props.maxDesigns, 5);
    if (!visitorKey) return { limit: max, used: 0, designs: [] };
    const designs =
      props.showMyDesigns === false
        ? []
        : await this.designs.find({
            select: ['id', 'product', 'size', 'quantity', 'color', 'material', 'status', 'createdAt'],
            where: { siteId: currentSiteId(), visitorKey },
            order: { createdAt: 'DESC' },
            take: 50,
          });
    const used = await this.designs.countBy({ siteId: currentSiteId(), pageId, blockId, visitorKey, status: Not('cancelled') });
    return { limit: max, used, designs };
  }

  /** The preview of one of the visitor's own designs. */
  async myPreview(id: string, visitor: string) {
    const visitorKey = visitorHash(visitor);
    const row = visitorKey
      ? await this.designs.findOne({ select: ['id', 'preview', 'previewType'], where: { id, siteId: currentSiteId(), visitorKey } })
      : null;
    if (!row?.preview) throw new NotFoundException();
    return { data: row.preview, type: row.previewType, ext: PICTURES[row.previewType] ?? '.jpg' };
  }

  private async notify(d: DesignRequest) {
    const to = (await this.settings.get()).notifyEmail;
    if (!canSendMail() || !to) return;
    const lines = [
      `Name: ${d.name}`,
      `Phone: ${d.phone}`,
      d.email && `Email: ${d.email}`,
      `Product: ${d.product}${d.size ? ` (${d.size})` : ''} × ${d.quantity}`,
      d.material && `Fabric: ${d.material}`,
      d.color && `Base color: ${d.color}`,
      d.notes && `\n${d.notes}`,
    ].filter(Boolean);
    await sendMail({
      to,
      replyTo: d.email || undefined,
      subject: `New print design: ${d.product} from ${d.name}`,
      text: `${lines.join('\n')}\n\nOpen Admin → Print orders to see the design and download the print file.`,
      attachments: [{ filename: `design-${d.id.slice(0, 8)}${PICTURES[d.previewType] ?? '.png'}`, content: d.preview }],
    });
  }

  list() {
    return this.designs.find({
      select: LIST_COLUMNS,
      where: { siteId: currentSiteId() },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  newCount() {
    return this.designs.countBy({ siteId: currentSiteId(), status: 'new' });
  }

  /** The preview or the print file, for the admin to look at or download. */
  async file(id: string, which: 'preview' | 'print') {
    const column = which === 'preview' ? 'preview' : 'printFile';
    const row = await this.designs
      .createQueryBuilder('d')
      .select(['d.id', 'd.product', `d.${column}`, which === 'preview' ? 'd.previewType' : 'd.printType'])
      .where('d.id = :id AND d.siteId = :siteId', { id, siteId: currentSiteId() })
      .getOne();
    if (!row) throw new NotFoundException();
    return {
      data: (which === 'preview' ? row.preview : row.printFile) as Buffer,
      type: which === 'preview' ? row.previewType : row.printType,
      ext: PICTURES[which === 'preview' ? row.previewType : row.printType] ?? '.png',
    };
  }

  async update(id: string, changes: { status?: DesignStatus; adminNote?: string }) {
    const d = await this.designs.findOne({ select: LIST_COLUMNS, where: { id, siteId: currentSiteId() } });
    if (!d) throw new NotFoundException();
    if (changes.status) d.status = changes.status;
    if (changes.adminNote !== undefined) d.adminNote = changes.adminNote.slice(0, 5000);
    await this.designs.update({ id, siteId: currentSiteId() }, { status: d.status, adminNote: d.adminNote });
    return d;
  }

  async remove(id: string) {
    const res = await this.designs.delete({ id, siteId: currentSiteId() });
    if (!res.affected) throw new NotFoundException();
  }
}
