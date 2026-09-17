import { Test, TestingModule } from '@nestjs/testing';
import { PrintersService } from './printers.service';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';
import { TemplateService } from './template.service';
import { ImageService } from './image.service';
import { FontService, PRINT_FONT_FAMILY } from './font.service';
import { NotFoundException } from '@nestjs/common';
import { TINY_PNG } from './image.util';

describe('PrintersService', () => {
  let service: PrintersService;
  let storage: StorageService;
  let htmlToPdfs: jest.Mock;
  let fontService: FontService;

  const pdfBuffer = Buffer.from('%PDF-1.4 mock');

  beforeEach(async () => {
    htmlToPdfs = jest.fn(async (htmls: string[]) =>
      htmls.map(() => pdfBuffer),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintersService,
        TemplateService,
        StorageService,
        ImageService,
        FontService,
        {
          provide: PdfService,
          useValue: {
            htmlToPdfs,
          },
        },
      ],
    }).compile();

    service = module.get(PrintersService);
    storage = module.get(StorageService);
    fontService = module.get(FontService);
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

  it('hydrates uploaded image ids into the HTML without storing data URLs in meta', async () => {
    const uploaded = await service.uploadImage({
      buffer: TINY_PNG,
      originalname: 'dot.png',
      size: TINY_PNG.length,
    } as Express.Multer.File);

    const job = await service.createJob({
      templateId: 'user-card',
      photo: uploaded.id,
      items: [
        { name: 'user1', table: 'josh' },
        { name: 'user2', table: 'anna' },
      ],
    });

    const htmls = htmlToPdfs.mock.calls[0][0] as string[];
    expect(htmls).toHaveLength(2);
    expect(htmls[0]).toContain('data:image/png;base64,');
    expect(htmls[1]).toContain('data:image/png;base64,');
    expect(job.photo).toBe(uploaded.id);
    expect(job.files[0].item.photo).toBeUndefined();
  });

  it('does not fail when the template font file is missing', async () => {
    const job = await service.createJob({
      templateId: 'user-card',
      items: [{ name: 'user1', table: 'josh' }],
    });

    expect(job.status).toBe('done');
    const html = (htmlToPdfs.mock.calls[0][0] as string[])[0];
    expect(html).not.toContain('@font-face');
  });

  it('embeds a local font into each HTML document when the file is found', async () => {
    jest.spyOn(fontService, 'load').mockResolvedValue({
      fontFamily: PRINT_FONT_FAMILY,
      fontSrc: 'data:font/woff2;base64,AAA',
      fontFormat: 'woff2',
    });

    await service.createJob({
      templateId: 'user-card',
      items: [
        { name: 'user1', table: 'josh' },
        { name: 'user2', table: 'anna' },
      ],
    });

    const htmls = htmlToPdfs.mock.calls[0][0] as string[];
    expect(htmls[0]).toContain('@font-face');
    expect(htmls[0]).toContain('data:font/woff2;base64,AAA');
    expect(htmls[1]).toContain('data:font/woff2;base64,AAA');
  });
});
