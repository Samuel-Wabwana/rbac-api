import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrintersModule } from './printers/printers.module';

@Module({
  imports: [PrintersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
