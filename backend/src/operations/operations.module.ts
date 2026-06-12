import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { StorageModule } from '../storage/storage.module';
import { OperationsController } from './operations.controller';

@Module({
  controllers: [OperationsController],
  imports: [StorageModule],
  providers: [OperationsService],
})
export class OperationsModule {}
