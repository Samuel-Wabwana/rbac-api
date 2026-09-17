import { Test, TestingModule } from '@nestjs/testing';
import { PrintersService } from './printers.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import { TemplateService } from './template.service';
import { NotFoundException } from '@nestjs/common';

describe('PrintersService', () => {
  let service: PrintersService;
  let storage: StorageService;

  const pdfBuffer = Buffer.from('%PDF-1.4 mock');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintersService,
        TemplateService,
        StorageService,
        {
          provide: PdfService,
          useValue: {
            htmlToPdfs: jest.fn(async (htmls: string[]) =>
              htmls.map(() => pdfBuffer),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(PrintersService);
    storage = module.get(StorageService);
  });

  it('creates one PDF per item and returns download urls', async () => {
    const job = await service.createJob({
      templateId: 'user-card',
      items: [
        { name: 'user1', table: 'josh' },
        { name: 'user2', table: 'anna' },
      ],
    });

    expect(job.status).toBe('done');
    expect(job.files).toHaveLength(2);
    expect(job.files[0].filename).toBe('user1.pdf');
    expect(job.files[0].downloadUrl).toBe(
      `/printers/jobs/${job.id}/files/${job.files[0].id}`,
    );

    const file = await service.getFile(job.id, job.files[0].id);
    expect(file.buffer.equals(pdfBuffer)).toBe(true);
    expect(file.filename).toBe('user1.pdf');
  });

  it('returns 404 metadata for an unknown job', async () => {
    await expect(service.getJob('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('persists job metadata on disk', async () => {
    const job = await service.createJob({
      templateId: 'user-card',
      items: [{ name: 'user1', table: 'josh' }],
    });
    const meta = await storage.readMeta(job.id);
    expect(meta.status).toBe('done');
    expect(meta.files).toHaveLength(1);
  });
});
