import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Validate,
} from 'class-validator';
import { IMAGE_ID } from '../image.util';
import { MAX_PRINT_JOB_ITEMS } from '../print-job.types';
import { PrintPageSizeConstraint } from './print-page-size.validator';

export class CreatePrintJobDto {
  @ApiProperty({
    example: 'user-card',
    description:
      'Identifiant d’un template connu (fichier .hbs, pas un chemin).',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'templateId must contain only lowercase letters, digits and hyphens',
  })
  templateId!: string;

  @ApiPropertyOptional({
    enum: ['A4', 'A5'],
    example: 'A5',
    description:
      'Format de page PDF. Incompatible avec width/height. Défaut : A5.',
  })
  @IsOptional()
  @IsIn(['A4', 'A5'])
  format?: 'A4' | 'A5';

  @ApiPropertyOptional({
    example: '148mm',
    description:
      'Largeur de page PDF. Obligatoire avec height si format est absent.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?(mm|cm|in|px)$/, {
    message: 'width must be a positive number with unit mm, cm, in or px',
  })
  width?: string;

  @ApiPropertyOptional({
    example: '210mm',
    description:
      'Hauteur de page PDF. Obligatoire avec width si format est absent.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?(mm|cm|in|px)$/, {
    message: 'height must be a positive number with unit mm, cm, in or px',
  })
  height?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['a1b2c3d4-e5f6-7890-ab12-34567890abcd'],
    description:
      'Ids d’images uploadées (POST /printers/images), 0 à 3. Partagées par tous les items au rendu (helper {{#image photos.0}}).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @Matches(IMAGE_ID, {
    each: true,
    message: 'each photo must be a UUID image id',
  })
  photos?: string[];

  @ApiPropertyOptional({
    example: 'Samedi',
    description: 'Jour de la semaine, partagé par tous les items au rendu.',
  })
  @IsOptional()
  @IsString()
  dayOfWeek?: string;

  @ApiPropertyOptional({
    example: '12',
    description: 'Jour du mois, partagé par tous les items au rendu.',
  })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiPropertyOptional({
    example: 'Août',
    description: 'Mois, partagé par tous les items au rendu.',
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({
    example: '2025',
    description: 'Année, partagée par tous les items au rendu.',
  })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({
    type: [String],
    minItems: 2,
    maxItems: 2,
    example: ['Hinata', 'Naruto'],
    description:
      'Les deux prénoms des mariés [prénom1, prénom2], partagés par tous les items au rendu.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  partners!: [string, string];

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
  @Validate(PrintPageSizeConstraint)
  items!: Record<string, unknown>[];
}
