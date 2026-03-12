import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Validates the API key and returns a signed JWT on success
  generateToken(apiKey: string): { access_token: string } {
    const validKey = this.config.getOrThrow<string>('API_KEY');

    if (apiKey !== validKey) {
      this.logger.warn('Token request failed: invalid API key');
      throw new UnauthorizedException('Invalid API key');
    }

    const payload = { sub: 'api-client' };
    const access_token = this.jwtService.sign(payload);

    this.logger.log('Access token issued');
    return { access_token };
  }
}
