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
  let module: TestingModule;
  let storage: StorageService;
  let htmlToPdfs: jest.Mock;
  let fontService: FontService;

  const pdfBuffer = Buffer.from('%PDF-1.4 mock');

  beforeEach(async () => {
    htmlToPdfs = jest.fn(async (htmls: string[]) =>
      htmls.map(() => pdfBuffer),
    );
    module = await Test.createTestingModule({
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
      partners: ['Hinata', 'Naruto'],
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
      partners: ['Hinata', 'Naruto'],
      items: [{ name: 'user1', table: 'josh' }],
    });
    const meta = await storage.readMeta(job.id);
    expect(meta.status).toBe('done');
    expect(meta.files).toHaveLength(1);
    expect(meta.pageSize).toEqual({ format: 'A5' });
  });

  it('passes custom page size to the pdf service', async () => {
    await service.createJob({
      templateId: 'user-card',
      format: 'A4',
      partners: ['Hinata', 'Naruto'],
      items: [{ name: 'user1', table: 'josh' }],
    });

    expect(htmlToPdfs).toHaveBeenCalledWith(expect.any(Array), { format: 'A4' });
  });

  it('passes width and height to the pdf service', async () => {
    await service.createJob({
      templateId: 'user-card',
      width: '148mm',
      height: '210mm',
      partners: ['Hinata', 'Naruto'],
      items: [{ name: 'user1', table: 'josh' }],
    });

    expect(htmlToPdfs).toHaveBeenCalledWith(expect.any(Array), {
      width: '148mm',
      height: '210mm',
    });
  });

  it('hydrates uploaded image ids into render context without storing data URLs in meta', async () => {
    const templateService = module.get(TemplateService);
    const renderSpy = jest.spyOn(templateService, 'render');

    const uploaded = await service.uploadImage({
      buffer: TINY_PNG,
      originalname: 'dot.png',
      size: TINY_PNG.length,
    } as Express.Multer.File);

    const job = await service.createJob({
      templateId: 'user-card',
      partners: ['Hinata', 'Naruto'],
      photos: [uploaded.id],
      dayOfWeek: 'Samedi',
      day: '12',
      month: 'Août',
      year: '2025',
      items: [
        { name: 'user1', table: 'josh' },
        { name: 'user2', table: 'anna' },
      ],
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    const context = renderSpy.mock.calls[0][1];
    const photos = context.photos as string[];
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatch(/^data:image\/png;base64,/);
    expect(context.dayOfWeek).toBe('Samedi');
    expect(context.day).toBe('12');
    expect(context.month).toBe('Août');
    expect(context.year).toBe('2025');
    expect(context.partners).toEqual(['Hinata', 'Naruto']);
    expect(job.photos).toEqual([uploaded.id]);
    expect(job.dayOfWeek).toBe('Samedi');
    expect(job.files[0].item.photos).toBeUndefined();
  });

  it('does not fail when the template font file is missing', async () => {
    const job = await service.createJob({
      templateId: 'user-card',
      partners: ['Hinata', 'Naruto'],
      items: [{ name: 'user1', table: 'josh' }],
    });

    expect(job.status).toBe('done');
    const html = (htmlToPdfs.mock.calls[0][0] as string[])[0];
    expect(html).not.toContain('@font-face');
  });

  it('injects a local font into each item render context when the file is found', async () => {
    const templateService = module.get(TemplateService);
    const renderSpy = jest.spyOn(templateService, 'render');

    jest.spyOn(fontService, 'load').mockResolvedValue({
      fontFamily: PRINT_FONT_FAMILY,
      fontSrc: 'data:font/woff2;base64,AAA',
      fontFormat: 'woff2',
    });

    await service.createJob({
      templateId: 'user-card',
      partners: ['Hinata', 'Naruto'],
      items: [
        { name: 'user1', table: 'josh' },
        { name: 'user2', table: 'anna' },
      ],
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    for (const call of renderSpy.mock.calls) {
      expect(call[1].fontSrc).toBe('data:font/woff2;base64,AAA');
      expect(call[1].fontFamily).toBe(PRINT_FONT_FAMILY);
    }
  });
});
