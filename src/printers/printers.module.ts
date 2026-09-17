import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { StorageService } from './storage.service';
import { TemplateService } from './template.service';

@Module({
  controllers: [PrintersController],
  providers: [PrintersService, TemplateService, PdfService, StorageService],
})
export class PrintersModule {}
