import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsString,
  Matches,
} from 'class-validator';
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

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ name: 'user1', table: 'josh' }],
    description: `Un PDF par élément. Maximum ${MAX_PRINT_JOB_ITEMS} items (génération synchrone).`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRINT_JOB_ITEMS)
  @IsObject({ each: true })
  items!: Record<string, unknown>[];
}
