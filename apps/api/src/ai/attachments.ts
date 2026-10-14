import { BadRequestException } from '@nestjs/common';
import sharp, { type Metadata } from 'sharp';

/** One piece of a message to the AI: text, a picture, or a PDF. */
export type AiPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/jpeg' | 'image/png'; data: string }
  | { type: 'pdf'; name: string; data: string };

/** What the conversation keeps of an attachment: enough to show it, never the file itself. */
export interface AttachmentInfo {
  name: string;
  kind: 'image' | 'pdf' | 'text';
  size: number;
  /** A small preview of a picture (a data: URL), for the conversation. */
  thumb?: string;
}

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 100_000;
/** Pictures are scaled down to this: larger ones cost more and show the model nothing more. */
const MAX_IMAGE_SIDE = 1568;
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|json|html?|css|js|ts|vue|xml|svg|ya?ml)$/i;

/** Multer reads names as latin1; control characters and angle brackets are dropped (names go into the prompt). */
const cleanName = (name: string) =>
  // eslint-disable-next-line no-control-regex
  (Buffer.from(name, 'latin1').toString('utf8') || 'file').replace(/[\u0000-\u001f<>"]/g, '').slice(0, 120);

function asText(buffer: Buffer): string | null {
  if (buffer.includes(0)) return null;
  const text = buffer.toString('utf8');
  return text.includes('�') ? null : text;
}

/**
 * Checks the files an admin attached to a builder request and turns them into message parts: pictures (scaled
 * down and re-encoded, which also drops anything hidden in them), PDFs, and text files (as text). Anything else is
 * refused with a message saying what is allowed.
 */
export async function readAttachments(files: Express.Multer.File[] = []): Promise<{ parts: AiPart[]; info: AttachmentInfo[] }> {
  if (files.length > MAX_ATTACHMENTS) throw new BadRequestException(`Attach up to ${MAX_ATTACHMENTS} files`);
  const parts: AiPart[] = [];
  const info: AttachmentInfo[] = [];
  for (const file of files) {
    const name = cleanName(file.originalname);
    const buffer = file.buffer;
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
      parts.push({ type: 'pdf', name, data: buffer.toString('base64') });
      info.push({ name, kind: 'pdf', size: buffer.length });
      continue;
    }
    if (TEXT_EXTENSIONS.test(name)) {
      const text = asText(buffer);
      if (text === null) throw new BadRequestException(`"${name}" is not a text file`);
      const shown = text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n[… cut off: the file is longer]` : text;
      parts.push({ type: 'text', text: `Attached file "${name}":\n<file name="${name}">\n${shown}\n</file>` });
      info.push({ name, kind: 'text', size: buffer.length });
      continue;
    }
    let meta: Metadata;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      meta = {} as Metadata;
    }
    if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff'].includes(meta.format)) {
      throw new BadRequestException(`"${name}" cannot be attached. Attach pictures, PDFs or text files (txt, md, csv, json, html, css…).`);
    }
    const resized = sharp(buffer)
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true });
    const png = Boolean(meta.hasAlpha);
    const out = await (png ? resized.png() : resized.jpeg({ quality: 85 })).toBuffer();
    const thumb = await sharp(buffer).rotate().resize({ width: 160, height: 160, fit: 'inside' }).webp({ quality: 60 }).toBuffer();
    parts.push({ type: 'image', mediaType: png ? 'image/png' : 'image/jpeg', data: out.toString('base64') });
    info.push({ name, kind: 'image', size: buffer.length, thumb: `data:image/webp;base64,${thumb.toString('base64')}` });
  }
  return { parts, info };
}

/** A short note for later requests, which carry the text of earlier messages but not their files. */
export function attachmentNote(info: AttachmentInfo[] = []) {
  return info.length ? `\n\n(Attached earlier: ${info.map((a) => a.name).join(', ')}.)` : '';
}
