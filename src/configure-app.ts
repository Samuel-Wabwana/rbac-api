import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MulterExceptionFilter } from './multer-exception.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new MulterExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
