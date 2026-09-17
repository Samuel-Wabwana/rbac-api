import { Injectable, InternalServerErrorException } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PdfService {
  async htmlToPdfs(htmlDocuments: string[]): Promise<Buffer[]> {
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
          const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
          });
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
}
