import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Body,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { PrintJobResponseDto } from './dto/print-job-response.dto';
import { PrintersService } from './printers.service';

@ApiTags('printers')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

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
