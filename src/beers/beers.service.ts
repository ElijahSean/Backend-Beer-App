import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beer } from './entities/beer.entity';
import { CreateBeerDto } from './dto/create-beer.dto';
import { BeerResponseDto } from './dto/beer-response.dto';
import { TemperatureReadingsService } from '../temperature-readings/temperature-readings.service';

@Injectable()
export class BeersService {
  private readonly logger = new Logger(BeersService.name);

  constructor(
    @InjectRepository(Beer)
    private readonly beersRepo: Repository<Beer>,

    private readonly temperatureReadingsService: TemperatureReadingsService,
  ) {}

  // Creates a beer and records its first temperature reading
  async create(
    dto: CreateBeerDto,
    imageUrl: string | null,
  ): Promise<BeerResponseDto> {
    if (dto.minTemp >= dto.maxTemp) {
      this.logger.warn('Create beer failed: minTemp is not less than maxTemp');
      throw new BadRequestException('minTemp must be less than maxTemp');
    }

    const existing = await this.beersRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      this.logger.warn('Create beer failed: duplicate name');
      throw new ConflictException(`Beer "${dto.name}" already exists`);
    }

    const beer = this.beersRepo.create({ ...dto, imageUrl });
    const saved = await this.beersRepo.save(beer);

    const currentTemperature = await this.temperatureReadingsService.recordReading(saved);

    this.logger.log(`Beer created [id=${saved.id}] [hasImage=${imageUrl !== null}]`);
    return this.toResponse(saved, currentTemperature);
  }

  // Returns all beers; records a fresh temperature per beer concurrently
  async findAll(): Promise<BeerResponseDto[]> {
    const beers = await this.beersRepo.find({ order: { createdAt: 'ASC' } });

    const responses = await Promise.all(
      beers.map(async (beer) => {
        const currentTemperature =
          await this.temperatureReadingsService.recordReading(beer);
        return this.toResponse(beer, currentTemperature);
      }),
    );

    this.logger.log(`Fetched ${beers.length} beer(s) with temperature readings`);
    return responses;
  }

  async findOne(id: string): Promise<Beer> {
    const beer = await this.beersRepo.findOne({ where: { id } });
    if (!beer) throw new NotFoundException(`Beer ${id} not found`);
    return beer;
  }

  // Maps a Beer entity + live temperature to the API response shape
  private toResponse(beer: Beer, currentTemperature: number): BeerResponseDto {
    return {
      id: beer.id,
      name: beer.name,
      minTemp: beer.minTemp,
      maxTemp: beer.maxTemp,
      imageUrl: beer.imageUrl,
      createdAt: beer.createdAt,
      currentTemperature,
      isInRange:
        currentTemperature >= beer.minTemp &&
        currentTemperature <= beer.maxTemp,
    };
  }
}
