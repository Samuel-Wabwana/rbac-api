import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { PrintJobResponseDto } from './dto/print-job-response.dto';
import { filenameFromItem } from './filename.util';
import { ImageService } from './image.service';
import { PdfService } from './pdf.service';
import { PrintJobMeta } from './print-job.types';
import { StorageService } from './storage.service';
import { TemplateService } from './template.service';

@Injectable()
export class PrintersService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
  ) {}

  uploadImage(file: Express.Multer.File) {
    return this.imageService.upload(file);
  }

  getImage(imageId: string) {
    return this.imageService.getFile(imageId);
  }

  async createJob(dto: CreatePrintJobDto): Promise<PrintJobResponseDto> {
    const now = new Date().toISOString();
    const jobId = randomUUID();
    const files = dto.items.map((item, index) => ({
      id: randomUUID(),
      filename: filenameFromItem(item, index),
      item,
    }));

    const meta: PrintJobMeta = {
      id: jobId,
      status: 'processing',
      templateId: dto.templateId,
      photo: dto.photo,
      files,
      createdAt: now,
      updatedAt: now,
    };
    await this.storageService.writeMeta(meta);

    try {
      const photoContext = dto.photo
        ? await this.imageService.hydrateItem({ photo: dto.photo })
        : {};
      const htmlDocuments = await Promise.all(
        dto.items.map(async (item) =>
          this.templateService.render(dto.templateId, {
            ...(await this.imageService.hydrateItem(item)),
            ...photoContext,
          }),
        ),
      );
      const pdfs = await this.pdfService.htmlToPdfs(htmlDocuments);

      await Promise.all(
        files.map((file, index) =>
          this.storageService.writePdf(jobId, file.id, pdfs[index]),
        ),
      );

      meta.status = 'done';
      meta.updatedAt = new Date().toISOString();
      await this.storageService.writeMeta(meta);
      return this.toResponse(meta);
    } catch (error) {
      meta.status = 'failed';
      meta.error = error instanceof Error ? error.message : 'Print job failed';
      meta.updatedAt = new Date().toISOString();
      await this.storageService.writeMeta(meta);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<PrintJobResponseDto> {
    const meta = await this.storageService.readMeta(jobId);
    return this.toResponse(meta);
  }

  async getFile(
    jobId: string,
    fileId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const meta = await this.requireDoneJob(jobId);
    const file = meta.files.find((entry) => entry.id === fileId);
    if (!file) {
      throw new NotFoundException(`File ${fileId} not found for job ${jobId}`);
    }
    const buffer = await this.storageService.readPdf(jobId, fileId);
    return { buffer, filename: file.filename };
  }

  async getArchive(
    jobId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const meta = await this.requireDoneJob(jobId);
    const buffer = await this.storageService.zipJob(jobId, meta.files);
    return { buffer, filename: `print-job-${jobId}.zip` };
  }

  private async requireDoneJob(jobId: string): Promise<PrintJobMeta> {
    const meta = await this.storageService.readMeta(jobId);
    if (meta.status !== 'done') {
      throw new UnprocessableEntityException(
        `Print job ${jobId} is ${meta.status} and cannot be downloaded`,
      );
    }
    return meta;
  }

  private toResponse(meta: PrintJobMeta): PrintJobResponseDto {
    return {
      id: meta.id,
      status: meta.status,
      templateId: meta.templateId,
      photo: meta.photo,
      error: meta.error,
      files: meta.files.map((file) => ({
        id: file.id,
        filename: file.filename,
        item: file.item,
        downloadUrl: `/printers/jobs/${meta.id}/files/${file.id}`,
      })),
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      archiveUrl: `/printers/jobs/${meta.id}/archive`,
    };
  }
}
