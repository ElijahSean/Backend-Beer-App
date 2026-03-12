// Response shape returned by POST /beers and GET /beers
export class BeerResponseDto {
  id: string;
  name: string;
  minTemp: number;
  maxTemp: number;
  imageUrl: string | null;
  createdAt: Date;
  currentTemperature: number; // freshly generated reading for this response
  isInRange: boolean;         // whether currentTemperature is within min/max
}
