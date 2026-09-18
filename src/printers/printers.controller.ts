import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { ImageResponseDto } from './dto/image-response.dto';
import { PrintJobResponseDto } from './dto/print-job-response.dto';
import { MAX_IMAGE_BYTES } from './image.util';
import { PrintersService } from './printers.service';

@ApiTags('printers')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post('images')
  @UseInterceptors(
    FilesInterceptor('file', 3, { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 3,
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Uploader une ou plusieurs images (PNG, JPEG, WebP, max 3) et récupérer leur(s) id(s)',
  })
  @ApiCreatedResponse({ type: ImageResponseDto })
  @ApiBadRequestResponse({
    description: 'Fichier manquant ou type non autorisé',
  })
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const uploads = files ?? [];
    if (uploads.length === 0) {
      throw new BadRequestException('A file field named "file" is required');
    }
    if (uploads.length === 1) {
      return this.printersService.uploadImage(uploads[0]);
    }
    return Promise.all(
      uploads.map((file) => this.printersService.uploadImage(file)),
    );
  }

  @Get('images/:imageId')
  @ApiOperation({ summary: 'Prévisualiser une image uploadée' })
  @ApiOkResponse({
    description: 'Fichier image',
    content: {
      'image/png': { schema: { type: 'string', format: 'binary' } },
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/webp': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse()
  async downloadImage(
    @Param('imageId', new ParseUUIDPipe({ version: '4' })) imageId: string,
  ) {
    const file = await this.printersService.getImage(imageId);
    const filename = file.originalName.replace(/["\\\r\n]/g, '_') || 'image';
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `inline; filename="${filename}"`,
    });
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Créer un job : JSON → HTML → un PDF par item' })
  @ApiCreatedResponse({ type: PrintJobResponseDto })
  @ApiBadRequestResponse({ description: 'Body invalide ou template inconnu' })
  create(@Body() createPrintJobDto: CreatePrintJobDto) {
    return this.printersService.createJob(createPrintJobDto);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Statut d’un job et liste des fichiers' })
  @ApiOkResponse({ type: PrintJobResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('jobId') jobId: string) {
    return this.printersService.getJob(jobId);
  }

  @Get('jobs/:jobId/files/:fileId')
  @ApiOperation({ summary: 'Télécharger un PDF du job' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Fichier PDF',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({ description: 'Job pas encore terminé' })
  @Header('Content-Type', 'application/pdf')
  async downloadFile(
    @Param('jobId') jobId: string,
    @Param('fileId') fileId: string,
  ) {
    const file = await this.printersService.getFile(jobId, fileId);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('jobs/:jobId/archive')
  @ApiOperation({ summary: 'Télécharger tous les PDF du job en ZIP' })
  @ApiProduces('application/zip')
  @ApiOkResponse({
    description: 'Archive ZIP',
    content: {
      'application/zip': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({ description: 'Job pas encore terminé' })
  async downloadArchive(@Param('jobId') jobId: string) {
    const archive = await this.printersService.getArchive(jobId);
    return new StreamableFile(archive.buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${archive.filename}"`,
    });
  }
}
