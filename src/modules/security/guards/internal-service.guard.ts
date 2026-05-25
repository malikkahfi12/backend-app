import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  INTERNAL_TOKEN_HEADER,
  INTERNAL_TOKEN_SCHEME,
} from '../constants/security.constants';
import { DevTokenService } from '../services/dev-token.service';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly devTokenService: DevTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header(INTERNAL_TOKEN_HEADER);

    if (!authorization?.startsWith(`${INTERNAL_TOKEN_SCHEME} `)) {
      throw new UnauthorizedException('Missing internal service token');
    }

    const token = authorization.slice(INTERNAL_TOKEN_SCHEME.length + 1).trim();

    if (this.devTokenService.validateInternalToken(token)) {
      return true;
    }

    throw new UnauthorizedException('Invalid internal service token');
  }
}
