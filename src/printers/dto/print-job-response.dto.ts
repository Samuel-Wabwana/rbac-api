import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PrintJobStatus } from '../print-job.types';

export class PrintJobFileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  item!: Record<string, unknown>;

  @ApiProperty()
  downloadUrl!: string;
}

export class PrintJobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['pending', 'processing', 'done', 'failed'] })
  status!: PrintJobStatus;

  @ApiProperty()
  templateId!: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty({ type: [PrintJobFileDto] })
  files!: PrintJobFileDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  archiveUrl!: string;
}
