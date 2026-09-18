import { Test, TestingModule } from '@nestjs/testing';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { StreamableFile } from '@nestjs/common';

describe('PrintersController', () => {
  let controller: PrintersController;
  const printersService = {
    createJob: jest.fn(),
    getJob: jest.fn(),
    getFile: jest.fn(),
    getArchive: jest.fn(),
    uploadImage: jest.fn(),
    getImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrintersController],
      providers: [{ provide: PrintersService, useValue: printersService }],
    }).compile();

    controller = module.get(PrintersController);
    jest.clearAllMocks();
  });

  it('delegates job creation', async () => {
    printersService.createJob.mockResolvedValue({ id: 'job-1' });
    await expect(
      controller.create({
        templateId: 'user-card',
        partners: ['Hinata', 'Naruto'],
        items: [{ name: 'user1' }],
      }),
    ).resolves.toEqual({ id: 'job-1' });
  });

  it('returns a streamable PDF', async () => {
    printersService.getFile.mockResolvedValue({
      buffer: Buffer.from('%PDF'),
      filename: 'user1.pdf',
    });
    const result = await controller.downloadFile('job-1', 'file-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
