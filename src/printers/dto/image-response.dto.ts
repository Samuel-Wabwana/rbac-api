import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'badge.png' })
  originalName!: string;

  @ApiProperty({ example: 'image/png' })
  contentType!: string;

  @ApiProperty({
    example: '/printers/images/a1b2c3d4-e5f6-7890-ab12-34567890abcd',
    description: 'URL de prévisualisation. Passer `id` (pas ce chemin) dans le job.',
  })
  url!: string;
}
