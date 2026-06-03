import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuthException } from '../exceptions/auth.exception';
import { CurrentUserPayload } from '../types/current-user.type';

interface AccessTokenPayload {
  sub: string;
  deviceId: string;
  username: string;
  purpose?: undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthException(
        'UNAUTHORIZED',
        'Authorization token is required',
        401,
      );
    }

    const token = authHeader.slice(7).trim();
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new AuthException(
        'INVALID_ACCESS_TOKEN',
        'Invalid or expired access token',
        401,
      );
    }

    if (payload.purpose) {
      throw new AuthException(
        'INVALID_ACCESS_TOKEN',
        'Invalid or expired access token',
        401,
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new AuthException('USER_INACTIVE', 'User account is inactive', 401);
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
