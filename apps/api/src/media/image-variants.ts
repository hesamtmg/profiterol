import { access, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { imageWidths } from '@profiterol/blocks';
import sharp from 'sharp';

/** Photo types that get resized copies. GIFs are left alone so animations keep working. */
export const RESIZABLE_EXT = /\.(jpe?g|png|webp|avif)$/i;

export const variantName = (filename: string, width: number) => `${filename.replace(RESIZABLE_EXT, '')}-${width}.webp`;

/**
 * Writes WebP copies of a photo at each width in `imageWidths` (never enlarged), next to the original,
 * and returns the original's size. Photos are turned upright first, following their EXIF orientation.
 */
export async function makeVariants(dir: string, filename: string): Promise<{ width: number; height: number }> {
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
  return { width, height };
}

export async function hasVariants(dir: string, filename: string): Promise<boolean> {
  try {
    await Promise.all(imageWidths.map((w) => access(join(dir, variantName(filename, w)))));
    return true;
  } catch {
    return false;
  }
}

export async function removeVariants(dir: string, filename: string) {
  await Promise.all(imageWidths.map((w) => unlink(join(dir, variantName(filename, w))).catch(() => undefined)));
}
