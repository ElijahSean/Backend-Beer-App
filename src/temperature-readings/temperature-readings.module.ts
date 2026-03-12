import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { TemperatureReadingsService } from './temperature-readings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TemperatureReading])],
  providers: [TemperatureReadingsService],
  exports: [TemperatureReadingsService], // consumed by BeersModule
})
export class TemperatureReadingsModule {}
