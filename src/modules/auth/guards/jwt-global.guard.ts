import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  IS_PUBLIC_KEY,
  IS_INTERNAL_KEY,
} from '../../security/constants/security.constants';
import type { CurrentUserPayload } from '../types/current-user.type';

interface AccessTokenPayload {
  sub: string;
  deviceId: string;
  username: string;
  purpose?: undefined;
}

@Injectable()
export class JwtGlobalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const isInternal = this.reflector.getAllAndOverride<boolean>(
      IS_INTERNAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isInternal) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token is required');
    }

    const token = authHeader.slice(7).trim();
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.purpose) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const currentUser: CurrentUserPayload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarInitials: this.computeInitials(user.displayName),
      isActive: user.isActive,
      deviceId: payload.deviceId,
      createdAt: user.createdAt.toISOString(),
    };

    request['user'] = currentUser;
    return true;
  }

  private computeInitials(displayName: string): string {
    const words = displayName.trim().split(/\s+/);
    const initials = words
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('');
    return initials.toUpperCase();
  }
}
