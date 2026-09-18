import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PdfPageSize, PrintJobStatus } from '../print-job.types';

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

  @ApiPropertyOptional({
    oneOf: [
      {
        type: 'object',
        properties: { format: { type: 'string', enum: ['A4', 'A5'] } },
        required: ['format'],
      },
      {
        type: 'object',
        properties: {
          width: { type: 'string', example: '148mm' },
          height: { type: 'string', example: '210mm' },
        },
        required: ['width', 'height'],
      },
    ],
    description:
      'Taille de page PDF utilisée pour le job (format prédéfini ou dimensions custom).',
  })
  pageSize?: PdfPageSize;

  @ApiPropertyOptional({
    type: [String],
    description: 'Ids d’images partagés par tous les items du job (0 à 3)',
  })
  photos?: string[];

  @ApiPropertyOptional()
  dayOfWeek?: string;

  @ApiPropertyOptional()
  day?: string;

  @ApiPropertyOptional()
  month?: string;

  @ApiPropertyOptional()
  year?: string;

  @ApiProperty({
    type: [String],
    minItems: 2,
    maxItems: 2,
    description: 'Les deux prénoms des mariés, partagés par tous les items du job',
  })
  partners!: [string, string];

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
