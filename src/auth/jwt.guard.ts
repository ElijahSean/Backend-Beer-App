import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Rejects requests without a valid Bearer JWT in the Authorization header
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
