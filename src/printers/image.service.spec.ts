import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImageService } from './image.service';
import { TINY_PNG } from './image.util';
import { StorageService } from './storage.service';

describe('ImageService', () => {
  const service = new ImageService(new StorageService());

  it('stores an image and returns an id, not a filesystem path', async () => {
    const result = await service.upload({
      buffer: TINY_PNG,
      originalname: 'dot.png',
      size: TINY_PNG.length,
    } as Express.Multer.File);

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.url).toBe(`/printers/images/${result.id}`);
    expect(result.url).not.toContain('storage');
    expect(result.contentType).toBe('image/png');
  });

  it('rejects non-image uploads', async () => {
    await expect(
      service.upload({
        buffer: Buffer.from('%PDF-1.4'),
        originalname: 'x.pdf',
        size: 8,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hydrates known image ids into data URLs', async () => {
    const uploaded = await service.upload({
      buffer: TINY_PNG,
      originalname: 'dot.png',
      size: TINY_PNG.length,
    } as Express.Multer.File);

    const hydrated = await service.hydrateItem({
      name: 'user1',
      photo: uploaded.id,
    });
    expect(hydrated.name).toBe('user1');
    expect(String(hydrated.photo)).toMatch(/^data:image\/png;base64,/);
  });

  it('leaves unknown uuids unchanged', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const hydrated = await service.hydrateItem({ photo: id });
    expect(hydrated.photo).toBe(id);
  });

  it('404s for an unknown image', async () => {
    await expect(
      service.getFile('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
