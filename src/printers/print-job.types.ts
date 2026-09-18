export type PrintJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export type PdfPageFormat = 'A4' | 'A5';

export type PdfPageSize =
  | { format: PdfPageFormat }
  | { width: string; height: string };

export const DEFAULT_PDF_PAGE_SIZE: PdfPageSize = { format: 'A5' };

export function resolvePdfPageSize(input: {
  format?: PdfPageFormat;
  width?: string;
  height?: string;
}): PdfPageSize {
  if (input.format) {
    return { format: input.format };
  }
  if (input.width && input.height) {
    return { width: input.width, height: input.height };
  }
  return DEFAULT_PDF_PAGE_SIZE;
}

export interface PrintJobFile {
  id: string;
  filename: string;
  item: Record<string, unknown>;
}

export interface PrintJobMeta {
  id: string;
  status: PrintJobStatus;
  templateId: string;
  pageSize?: PdfPageSize;
  photos?: string[];
  dayOfWeek?: string;
  day?: string;
  month?: string;
  year?: string;
  partners: [string, string];
  error?: string;
  files: PrintJobFile[];
  createdAt: string;
  updatedAt: string;
}

export const MAX_PRINT_JOB_ITEMS = 30;
