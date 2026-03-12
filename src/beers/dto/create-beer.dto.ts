import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Input shape for POST /beers (multipart/form-data)
export class CreateBeerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // @Type coerces the multipart string value to a number before validation
  @Type(() => Number)
  @IsNumber()
  @Min(-10)
  @Max(20)
  minTemp: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-10)
  @Max(20)
  maxTemp: number;
}
