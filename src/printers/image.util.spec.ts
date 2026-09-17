import {
  detectImageContentType,
  isImageDataUrl,
  TINY_PNG,
  toDataUrl,
} from './image.util';

describe('image.util', () => {
  it('detects PNG magic bytes', () => {
    expect(detectImageContentType(TINY_PNG)).toBe('image/png');
  });

  it('rejects non-image buffers', () => {
    expect(detectImageContentType(Buffer.from('%PDF'))).toBeNull();
  });

  it('builds a data URL', () => {
    const url = toDataUrl('image/png', TINY_PNG);
    expect(isImageDataUrl(url)).toBe(true);
  });
});
