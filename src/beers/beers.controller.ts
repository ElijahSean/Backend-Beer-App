import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BeersService } from './beers.service';
import { CreateBeerDto } from './dto/create-beer.dto';
import { BeerResponseDto } from './dto/beer-response.dto';
import { StorageService } from '../storage/storage.service';
import { JwtGuard } from '../auth/jwt.guard';

@UseGuards(JwtGuard)
@Controller('beers')
export class BeersController {
  constructor(
    private readonly beersService: BeersService,
    private readonly storageService: StorageService,
  ) {}

  // POST /beers — create a beer with an optional image (multipart/form-data)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    }),
  )
  async create(
    @Body() dto: CreateBeerDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BeerResponseDto> {
    const imageUrl = file
      ? await this.storageService.uploadImage(file)
      : null;

    return this.beersService.create(dto, imageUrl);
  }

  // GET /beers — list all beers with a fresh temperature reading each
  @Get()
  findAll(): Promise<BeerResponseDto[]> {
    return this.beersService.findAll();
  }
}
