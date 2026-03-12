import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { Beer } from '../beers/entities/beer.entity';

@Injectable()
export class TemperatureReadingsService {
  private readonly logger = new Logger(TemperatureReadingsService.name);

  constructor(
    @InjectRepository(TemperatureReading)
    private readonly readingsRepo: Repository<TemperatureReading>,
  ) {}

  // Generates a random temperature (0–7 °C), persists it, and returns the value
  async recordReading(beer: Beer): Promise<number> {
    const temperature = parseFloat((Math.random() * 7).toFixed(1));

    const reading = this.readingsRepo.create({ beer, temperature });
    await this.readingsRepo.save(reading);

    this.logger.log(`Temperature recorded [beerId=${beer.id}] [inRange=${temperature >= beer.minTemp && temperature <= beer.maxTemp}]`);
    return temperature;
  }
}
