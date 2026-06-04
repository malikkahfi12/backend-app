import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JwtGlobalGuard } from './jwt-global.guard';

describe('JwtGlobalGuard', () => {
  const VALID_TOKEN = 'valid-jwt-token';
  const VALID_PAYLOAD = {
    sub: 'user-1',
    deviceId: 'device-1',
    username: 'malik',
  };

  const ACTIVE_USER = {
    id: 'user-1',
    username: 'malik',
    displayName: 'Malik',
    avatarUrl: null,
    isActive: true,
    deviceId: 'device-1',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const createContext = (authorization?: string): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name === 'authorization' ? authorization : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (
    isPublic = false,
    isInternal = false,
  ): JwtGlobalGuard => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return isPublic;
        if (key === 'isInternal') return isInternal;
        return false;
      }),
    } as unknown as Reflector;

    const jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token === VALID_TOKEN) return Promise.resolve(VALID_PAYLOAD);
        if (token === 'token-with-purpose')
          return Promise.resolve({
            ...VALID_PAYLOAD,
            purpose: 'recovery',
          });
        return Promise.reject(new Error('Invalid token'));
      }),
    } as unknown as JwtService;

    const prismaService = {
      user: {
        findUnique: jest.fn((args: { where: { id: string } }) => {
          if (args.where.id === 'user-1') return Promise.resolve(ACTIVE_USER);
          if (args.where.id === 'user-inactive')
            return Promise.resolve({
              ...ACTIVE_USER,
              isActive: false,
              id: 'user-inactive',
            });
          return Promise.resolve(null);
        }),
      },
    } as unknown as PrismaService;

    return new JwtGlobalGuard(reflector, jwtService, prismaService);
  };

  describe('public routes', () => {
    it('allows @Public() route without token', async () => {
      const guard = createGuard(true, false);
      const result = await guard.canActivate(createContext());
      expect(result).toBe(true);
    });
  });

  describe('internal routes', () => {
    it('allows @Internal() route without token', async () => {
      const guard = createGuard(false, true);
      const result = await guard.canActivate(createContext());
      expect(result).toBe(true);
    });

    it('allows @Internal() route even with JWT token present', async () => {
      const guard = createGuard(false, true);
      const result = await guard.canActivate(
        createContext('Bearer some-internal-token'),
      );
      expect(result).toBe(true);
    });
  });

  describe('protected routes', () => {
    it('rejects missing Authorization header', async () => {
      const guard = createGuard(false, false);
      await expect(guard.canActivate(createContext())).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(createContext())).rejects.toThrow(
        'Authorization token is required',
      );
    });

    it('rejects non-Bearer Authorization header', async () => {
      const guard = createGuard(false, false);
      await expect(
        guard.canActivate(createContext('Basic some-token')),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects invalid JWT token', async () => {
      const guard = createGuard(false, false);
      await expect(
        guard.canActivate(createContext('Bearer invalid-token')),
      ).rejects.toThrow('Invalid or expired access token');
    });

    it('rejects token with purpose field (recovery token)', async () => {
      const guard = createGuard(false, false);
      await expect(
        guard.canActivate(createContext('Bearer token-with-purpose')),
      ).rejects.toThrow('Invalid or expired access token');
    });

    it('rejects valid token for inactive user', async () => {
      const context = createContext(`Bearer ${VALID_TOKEN}`);

      const reflector = {
        getAllAndOverride: jest.fn(() => false),
      } as unknown as Reflector;

      const jwtService = {
        verifyAsync: jest.fn(() =>
          Promise.resolve({
            sub: 'user-inactive',
            deviceId: 'device-1',
            username: 'malik',
          }),
        ),
      } as unknown as JwtService;

      const prismaService = {
        user: {
          findUnique: jest.fn(() =>
            Promise.resolve({
              ...ACTIVE_USER,
              id: 'user-inactive',
              isActive: false,
            }),
          ),
        },
      } as unknown as PrismaService;

      const inactiveGuard = new JwtGlobalGuard(
        reflector,
        jwtService,
        prismaService,
      );

      await expect(inactiveGuard.canActivate(context)).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('accepts valid token and attaches user to request', async () => {
      const guard = createGuard(false, false);
      const mockRequest: Record<string, unknown> = {};
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      Object.defineProperty(mockRequest, 'header', {
        value: (name: string) =>
          name === 'authorization' ? `Bearer ${VALID_TOKEN}` : undefined,
        writable: true,
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockRequest['user']).toBeDefined();
      expect(mockRequest['user']).toMatchObject({
        id: 'user-1',
        username: 'malik',
        displayName: 'Malik',
        isActive: true,
        deviceId: 'device-1',
      });
    });
  });
});
