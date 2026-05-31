import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuthException } from '../exceptions/auth.exception';
import { JwtAuthGuard } from './jwt-auth.guard';

const mockUser = {
  id: 'user-uuid',
  username: 'malik',
  displayName: 'Malik',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ACCESS_PAYLOAD = {
  sub: 'user-uuid',
  deviceId: 'device-uuid',
  username: 'malik',
};

function createContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () =>
        ({
          header: (name: string) =>
            name === 'authorization' ? authHeader : undefined,
        }) as unknown as Request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(overrides?: {
  verifyAsync?: jest.Mock;
  findUnique?: jest.Mock;
  user?: typeof mockUser | null;
}): JwtAuthGuard {
  const jwtService = {
    verifyAsync:
      overrides?.verifyAsync ?? jest.fn().mockResolvedValue(ACCESS_PAYLOAD),
  } as unknown as JwtService;

  const prismaService = {
    user: {
      findUnique:
        overrides?.findUnique ??
        jest.fn().mockResolvedValue(overrides?.user ?? mockUser),
    },
  } as unknown as PrismaService;

  return new JwtAuthGuard(jwtService, prismaService);
}

describe('JwtAuthGuard', () => {
  it('returns true for valid Bearer token and active user', async () => {
    const context = createContext('Bearer valid.jwt.token');
    const guard = createGuard();
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('attaches current user to request', async () => {
    const request = {
      header: () => 'Bearer valid.jwt.token',
      user: undefined,
    } as unknown as Request;

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const guard = createGuard();
    await guard.canActivate(context);

    expect(request['user']).toEqual({
      id: 'user-uuid',
      username: 'malik',
      displayName: 'Malik',
      avatarUrl: null,
      avatarInitials: 'M',
      isActive: true,
      deviceId: 'device-uuid',
      createdAt: expect.any(String),
    });
  });

  it('throws UNAUTHORIZED for missing Authorization header', async () => {
    const context = createContext(undefined);
    const guard = createGuard();

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('UNAUTHORIZED');
    }
  });

  it('throws UNAUTHORIZED for non-Bearer scheme', async () => {
    const context = createContext('Basic dXNlcjpwYXNz');
    const guard = createGuard();

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('UNAUTHORIZED');
    }
  });

  it('throws INVALID_ACCESS_TOKEN for malformed JWT', async () => {
    const context = createContext('Bearer bad.token');
    const guard = createGuard({
      verifyAsync: jest.fn().mockRejectedValue(new Error('jwt malformed')),
    });

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('INVALID_ACCESS_TOKEN');
    }
  });

  it('throws INVALID_ACCESS_TOKEN for expired JWT', async () => {
    const context = createContext('Bearer expired.token');
    const guard = createGuard({
      verifyAsync: jest.fn().mockRejectedValue(new Error('jwt expired')),
    });

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('INVALID_ACCESS_TOKEN');
    }
  });

  it('throws USER_INACTIVE for inactive user', async () => {
    const context = createContext('Bearer valid.jwt.token');
    const guard = createGuard({
      user: { ...mockUser, isActive: false },
    });

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('USER_INACTIVE');
    }
  });

  it('throws USER_INACTIVE when user not found', async () => {
    const context = createContext('Bearer valid.jwt.token');
    const guard = createGuard({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthException);
      expect((error as AuthException).code).toBe('USER_INACTIVE');
    }
  });
});
