import { access, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { imageWidths } from '@profiterol/blocks';
import sharp from 'sharp';

/** Photo types that get resized copies. GIFs are left alone so animations keep working. */
export const RESIZABLE_EXT = /\.(jpe?g|png|webp|avif)$/i;

export const variantName = (filename: string, width: number, format: 'webp' | 'avif' = 'webp') =>
  `${filename.replace(RESIZABLE_EXT, '')}-${width}.${format}`;

/**
 * Writes WebP copies of a photo at each width in `imageWidths` (never enlarged), next to the original,
 * and returns the original's size and a tiny blurred preview. Photos are turned upright first, following
 * their EXIF orientation.
 */
export async function makeVariants(dir: string, filename: string): Promise<{ width: number; height: number; placeholder: string | null }> {
  const source = join(dir, filename);
  const meta = await sharp(source).rotate().metadata();
  const upright = (meta.orientation ?? 1) >= 5;
  const width = (upright ? meta.height : meta.width) ?? 0;
  const height = (upright ? meta.width : meta.height) ?? 0;
  for (const w of imageWidths) {
    await sharp(source)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(join(dir, variantName(filename, w)));
  }
  return { width, height, placeholder: meta.hasAlpha ? null : await placeholderOf(source) };
}

/**
 * A few hundred bytes that stand in for the photo while it loads (a data: URL). Only for photos without
 * transparency: behind a cut-out it would show through.
 */
export async function placeholderOf(source: string): Promise<string> {
  const tiny = await sharp(source).rotate().resize({ width: 24 }).blur(1).webp({ quality: 50 }).toBuffer();
  return `data:image/webp;base64,${tiny.toString('base64')}`;
}

/** AVIF copies are smaller still but slow to make, so they are made after the upload has finished. */
export async function makeAvifVariants(dir: string, filename: string) {
  const source = join(dir, filename);
  for (const w of imageWidths) {
    await sharp(source)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: 50, effort: 2 })
      .toFile(join(dir, variantName(filename, w, 'avif')));
  }
}

async function allExist(dir: string, filename: string, format: 'webp' | 'avif') {
  try {
    await Promise.all(imageWidths.map((w) => access(join(dir, variantName(filename, w, format)))));
    return true;
  } catch {
    return false;
  }
}

export const hasVariants = (dir: string, filename: string) => allExist(dir, filename, 'webp');
export const hasAvifVariants = (dir: string, filename: string) => allExist(dir, filename, 'avif');

export async function removeVariants(dir: string, filename: string) {
  const names = imageWidths.flatMap((w) => [variantName(filename, w), variantName(filename, w, 'avif')]);
  await Promise.all(names.map((n) => unlink(join(dir, n)).catch(() => undefined)));
}
