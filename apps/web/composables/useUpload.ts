import type { MediaItem } from './useAdminTypes';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm'];

/** Uploads one file to the media library. */
export function useUpload() {
  const api = useApi();
  const uploading = ref(false);
  const error = ref('');

  async function upload(file: File): Promise<MediaItem | null> {
    error.value = '';
    if (!ACCEPTED.includes(file.type)) {
      error.value = `${file.name}: only JPG, PNG, WebP, GIF, AVIF, MP4 and WebM files can be uploaded`;
      return null;
    }
    uploading.value = true;
    try {
      const body = new FormData();
      body.append('file', file);
      return await api<MediaItem>('/admin/media', { method: 'POST', body });
    } catch (err) {
      error.value = `${file.name}: ${apiErrorMessage(err)}`;
      return null;
    } finally {
      uploading.value = false;
    }
  }

  return { upload, uploading, error };
}

/** The first image file in a drop or paste, if any. */
export function imageFrom(data: DataTransfer | null): File | null {
  return Array.from(data?.files ?? []).find((f) => f.type.startsWith('image/')) ?? null;
}
