import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ImageResponseDto } from './dto/image-response.dto';
import { StoredImageMeta } from './image.types';
import {
  IMAGE_ID,
  MAX_IMAGE_BYTES,
  detectImageContentType,
  toDataUrl,
} from './image.util';
import { StorageService } from './storage.service';

@Injectable()
export class ImageService {
  constructor(private readonly storageService: StorageService) {}

  async upload(file: Express.Multer.File): Promise<ImageResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A file field named "file" is required');
    }
    if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image must be at most ${MAX_IMAGE_BYTES} bytes`,
      );
    }

    const contentType = detectImageContentType(file.buffer);
    if (!contentType) {
      throw new BadRequestException('Only PNG, JPEG and WebP images are allowed');
    }

    const meta: StoredImageMeta = {
      id: randomUUID(),
      originalName: file.originalname || 'image',
      contentType,
      createdAt: new Date().toISOString(),
    };
    await this.storageService.writeImage(meta, file.buffer);
    return this.toResponse(meta);
  }

  async getFile(imageId: string): Promise<{
    buffer: Buffer;
    contentType: string;
    originalName: string;
  }> {
    const { meta, buffer } = await this.storageService.readImage(imageId);
    return {
      buffer,
      contentType: meta.contentType,
      originalName: meta.originalName,
    };
  }

  async hydrateItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const next: Record<string, unknown> = { ...item };
    for (const [key, value] of Object.entries(item)) {
      if (typeof value !== 'string' || !IMAGE_ID.test(value)) {
        continue;
      }
      try {
        const { meta, buffer } = await this.storageService.readImage(value);
        next[key] = toDataUrl(meta.contentType, buffer);
      } catch {
        // UUID that is not a stored image (ex. id métier) stays as-is.
      }
    }
    return next;
  }

  toResponse(meta: StoredImageMeta): ImageResponseDto {
    return {
      id: meta.id,
      originalName: meta.originalName,
      contentType: meta.contentType,
      url: `/printers/images/${meta.id}`,
    };
  }
}
