import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, API_KEY_HEADER } from '../constants/security.constants';
import { DevTokenService } from '../services/dev-token.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly devTokenService: DevTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header(API_KEY_HEADER);

    if (this.devTokenService.validateApiKey(apiKey ?? '')) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing API key');
  }
}
