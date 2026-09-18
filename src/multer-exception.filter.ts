import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception.code === 'LIMIT_FILE_SIZE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;

    const message = exception.field
      ? `${exception.message} (${exception.field})`
      : exception.message;

    response.status(status).json({
      statusCode: status,
      message,
      error:
        status === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'Payload Too Large'
          : 'Bad Request',
    });
  }
}
