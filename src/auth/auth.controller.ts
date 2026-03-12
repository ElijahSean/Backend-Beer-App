import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class TokenRequestDto {
  @IsString()
  apiKey: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/token — exchange API key for a 24-hour JWT
  @Post('token')
  @HttpCode(HttpStatus.OK)
  getToken(@Body() dto: TokenRequestDto): { access_token: string } {
    return this.authService.generateToken(dto.apiKey);
  }
}
