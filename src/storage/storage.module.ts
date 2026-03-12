import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Wraps StorageService and exports it for use in other modules
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
