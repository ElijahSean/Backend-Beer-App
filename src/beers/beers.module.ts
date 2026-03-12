import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Beer } from './entities/beer.entity';
import { BeersController } from './beers.controller';
import { BeersService } from './beers.service';
import { TemperatureReadingsModule } from '../temperature-readings/temperature-readings.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Beer]),
    TemperatureReadingsModule, // provides TemperatureReadingsService
    StorageModule,             // provides StorageService
  ],
  controllers: [BeersController],
  providers: [BeersService],
})
export class BeersModule {}
