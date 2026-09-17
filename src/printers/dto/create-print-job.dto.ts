import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { IMAGE_ID } from '../image.util';
import { MAX_PRINT_JOB_ITEMS } from '../print-job.types';

export class CreatePrintJobDto {
  @ApiProperty({
    example: 'user-card',
    description: 'Identifiant d’un template connu (fichier .hbs, pas un chemin).',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'templateId must contain only lowercase letters, digits and hyphens',
  })
  templateId!: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-ab12-34567890abcd',
    description:
      'Id d’une image uploadée (POST /printers/images). Partagée par tous les items au rendu (helper {{#image photo}}).',
  })
  @IsOptional()
  @IsString()
  @Matches(IMAGE_ID, { message: 'photo must be a UUID image id' })
  photo?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ name: 'user1', table: 'josh' }],
    description: `Un PDF par élément. Maximum ${MAX_PRINT_JOB_ITEMS} items.`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRINT_JOB_ITEMS)
  @IsObject({ each: true })
  items!: Record<string, unknown>[];
}
