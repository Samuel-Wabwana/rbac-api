import { Injectable, InternalServerErrorException } from '@nestjs/common';
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import {
  DEFAULT_PDF_PAGE_SIZE,
  PdfPageSize,
} from './print-job.types';

@Injectable()
export class PdfService {
  async htmlToPdfs(
    htmlDocuments: string[],
    pageSize: PdfPageSize = DEFAULT_PDF_PAGE_SIZE,
  ): Promise<Buffer[]> {
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const pdfs: Buffer[] = [];
      for (const html of htmlDocuments) {
        const page = await browser.newPage();
        try {
          await page.setContent(html, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          const pdf = await page.pdf(this.buildPdfOptions(pageSize));
          pdfs.push(Buffer.from(pdf));
        } finally {
          await page.close();
        }
      }
      return pdfs;
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'PDF rendering failed',
      );
    } finally {
      await browser?.close();
    }
  }

  private buildPdfOptions(pageSize: PdfPageSize): PDFOptions {
    const options: PDFOptions = {
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    };

    if ('format' in pageSize) {
      options.format = pageSize.format;
    } else {
      options.width = pageSize.width;
      options.height = pageSize.height;
    }

    return options;
  }
}
