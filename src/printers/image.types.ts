import type { AllowedImageContentType } from './image.util';

export interface StoredImageMeta {
  id: string;
  originalName: string;
  contentType: AllowedImageContentType;
  createdAt: string;
}
