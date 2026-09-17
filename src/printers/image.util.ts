export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AllowedImageContentType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageContentType(
  buffer: Buffer,
): AllowedImageContentType | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG)) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function toDataUrl(
  contentType: AllowedImageContentType,
  buffer: Buffer,
): string {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export function isImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
    value,
  );
}

export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
