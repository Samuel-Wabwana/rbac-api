export type PrintJobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface PrintJobFile {
  id: string;
  filename: string;
  item: Record<string, unknown>;
}

export interface PrintJobMeta {
  id: string;
  status: PrintJobStatus;
  templateId: string;
  error?: string;
  files: PrintJobFile[];
  createdAt: string;
  updatedAt: string;
}

export const MAX_PRINT_JOB_ITEMS = 30;
