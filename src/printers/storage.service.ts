import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';
import { PrintJobMeta } from './print-job.types';

@Injectable()
export class StorageService {
  private readonly root = join(process.cwd(), 'storage', 'pdfs');

  jobDir(jobId: string): string {
    return join(this.root, jobId);
  }

  pdfPath(jobId: string, fileId: string): string {
    return join(this.jobDir(jobId), `${fileId}.pdf`);
  }

  private metaPath(jobId: string): string {
    return join(this.jobDir(jobId), 'meta.json');
  }

  async ensureJobDir(jobId: string): Promise<void> {
    await fs.mkdir(this.jobDir(jobId), { recursive: true });
  }

  async writeMeta(meta: PrintJobMeta): Promise<void> {
    await this.ensureJobDir(meta.id);
    await fs.writeFile(this.metaPath(meta.id), JSON.stringify(meta, null, 2), 'utf8');
  }

  async readMeta(jobId: string): Promise<PrintJobMeta> {
    try {
      const raw = await fs.readFile(this.metaPath(jobId), 'utf8');
      return JSON.parse(raw) as PrintJobMeta;
    } catch {
      throw new NotFoundException(`Print job ${jobId} not found`);
    }
  }

  async writePdf(jobId: string, fileId: string, buffer: Buffer): Promise<void> {
    await this.ensureJobDir(jobId);
    await fs.writeFile(this.pdfPath(jobId, fileId), buffer);
  }

  async readPdf(jobId: string, fileId: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.pdfPath(jobId, fileId));
    } catch {
      throw new NotFoundException(`File ${fileId} not found for job ${jobId}`);
    }
  }

  async zipJob(
    jobId: string,
    files: { id: string; filename: string }[],
  ): Promise<Buffer> {
    await this.readMeta(jobId);
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (const file of files) {
      const count = usedNames.get(file.filename) ?? 0;
      usedNames.set(file.filename, count + 1);
      const name =
        count === 0 ? file.filename : file.filename.replace(/\.pdf$/i, `-${count + 1}.pdf`);
      zip.file(name, await this.readPdf(jobId, file.id));
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}
