import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthException } from './exceptions/auth.exception';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './services/google-auth.service';
import { TokenService } from './services/token.service';

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIs.access-token';
const REFRESH_TOKEN = 'dGVzdC11dWlk.test-refresh-token-base64';
const TOKEN_HASH = '$argon2id$hashed-refresh-token';
const CHALLENGE_BASE64URL = 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U';
const SIGNATURE_BASE64URL = 'c2lnbmF0dXJlLWJhc2U2NHVybA';
const PUBLIC_KEY = 'IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI';

jest.mock('libsodium-wrappers', () => ({
  __esModule: true,
  default: {
    ready: Promise.resolve(),
    crypto_sign_verify_detached: jest.fn(),
    crypto_sign_PUBLICKEYBYTES: 32,
  },
}));

import _sodium from 'libsodium-wrappers';

const mockUser = {
  id: 'user-uuid',
  username: 'malik',
  displayName: 'Malik',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date('2025-05-29T12:00:00.000Z'),
  updatedAt: new Date('2025-05-29T12:00:00.000Z'),
};

const mockDevice = {
  id: 'device-uuid',
  userId: 'user-uuid',
  publicKey: PUBLIC_KEY,
  deviceName: 'iPhone 17 Pro',
  platform: 'ios',
  lastSeenAt: new Date('2025-05-29T12:00:00.000Z'),
  createdAt: new Date('2025-05-29T12:00:00.000Z'),
  updatedAt: new Date('2025-05-29T12:00:00.000Z'),
};

const mockChallengeRecord = {
  id: 'challenge-uuid',
  userId: 'user-uuid',
  deviceId: 'device-uuid',
  challenge: CHALLENGE_BASE64URL,
  expiresAt: new Date(Date.now() + 300000),
  consumedAt: null,
  createdAt: new Date(),
};

const mockRefreshRecord = {
  id: 'refresh-uuid',
  userId: 'user-uuid',
  deviceId: 'device-uuid',
  tokenHash: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 86400000),
  revokedAt: null,
  createdAt: new Date('2025-05-29T12:00:00.000Z'),
  updatedAt: new Date('2025-05-29T12:00:00.000Z'),
};

const VALID_PUBLIC_KEY = 'IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI';

const validDto = {
  username: 'Malik',
  displayName: 'Malik',
  publicKey: VALID_PUBLIC_KEY,
  deviceName: 'iPhone 17 Pro',
  platform: 'ios',
};

function createMockTx(
  custom: {
    findUnique?: jest.Mock;
    createUser?: jest.Mock;
    createDevice?: jest.Mock;
  } = {},
) {
  return {
    user: {
      findUnique: custom.findUnique ?? jest.fn().mockResolvedValue(null),
      create: custom.createUser ?? jest.fn().mockResolvedValue(mockUser),
    },
    userDevice: {
      create: custom.createDevice ?? jest.fn().mockResolvedValue(mockDevice),
    },
  };
}

function defaultTokenService(): TokenService {
  return {
    signAccessToken: jest.fn().mockResolvedValue(ACCESS_TOKEN),
    signRecoveryToken: jest.fn().mockResolvedValue('signed-recovery-jwt'),
    verifyRecoveryToken: jest.fn().mockResolvedValue({
      sub: 'user-uuid',
      purpose: 'account_recovery',
    }),
    generateRefreshToken: jest.fn().mockResolvedValue({
      rawToken: REFRESH_TOKEN,
      tokenHash: TOKEN_HASH,
    }),
    verifyTokenHash: jest.fn().mockResolvedValue(true),
    getAccessTokenExpirySeconds: jest.fn().mockReturnValue(900),
    getRefreshTokenExpiresAt: jest
      .fn()
      .mockReturnValue(new Date(Date.now() + 86400000)),
  } as unknown as TokenService;
}

function defaultGoogleAuthService(): GoogleAuthService {
  return {
    verifyIdToken: jest.fn().mockResolvedValue({
      sub: 'google-user-123',
      email: 'user@gmail.com',
      emailVerified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    }),
  } as unknown as GoogleAuthService;
}

interface PrismaMocks {
  tx?: {
    findUnique?: jest.Mock;
    createUser?: jest.Mock;
    createDevice?: jest.Mock;
  };
  userFindUnique?: jest.Mock;
  userDeviceFindFirst?: jest.Mock;
  userFindUniqueOrThrow?: jest.Mock;
  refreshFindUnique?: jest.Mock;
  challengeFindUnique?: jest.Mock;
}

function buildPrismaService(mocks: PrismaMocks = {}): PrismaService {
  return {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb(createMockTx(mocks.tx)),
    ),
    user: {
      findUnique: mocks.userFindUnique ?? jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser),
      findUniqueOrThrow:
        mocks.userFindUniqueOrThrow ?? jest.fn().mockResolvedValue(mockUser),
    } as unknown,
    userDevice: {
      findFirst:
        mocks.userDeviceFindFirst ?? jest.fn().mockResolvedValue(mockDevice),
      findMany: jest.fn().mockResolvedValue([mockDevice]),
      create: jest.fn().mockResolvedValue(mockDevice),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown,
    refreshToken: {
      create: jest.fn().mockResolvedValue(mockRefreshRecord),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique:
        mocks.refreshFindUnique ??
        jest.fn().mockResolvedValue({
          ...mockRefreshRecord,
          user: mockUser,
        }),
    } as unknown,
    authChallenge: {
      create: jest.fn().mockResolvedValue(mockChallengeRecord),
      findUnique:
        mocks.challengeFindUnique ??
        jest.fn().mockResolvedValue(mockChallengeRecord),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown,
    authIdentity: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'identity-uuid',
        userId: 'user-uuid',
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'user@gmail.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'identity-uuid',
        userId: 'user-uuid',
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'user@gmail.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown,
  } as unknown as PrismaService;
}

async function makeService(
  mocks: PrismaMocks = {},
  tokenService?: TokenService,
  googleAuthService?: GoogleAuthService,
): Promise<AuthService> {
  const service = new AuthService(
    buildPrismaService(mocks),
    tokenService ?? defaultTokenService(),
    googleAuthService ?? defaultGoogleAuthService(),
  );
  await service.onModuleInit();
  return service;
}

describe('AuthService', () => {
  beforeEach(() => {
    (_sodium.crypto_sign_verify_detached as jest.Mock).mockReturnValue(true);
  });

  describe('registerDevice', () => {
    it('registers a user and device with tokens', async () => {
      const service = await makeService();
      const result = await service.registerDevice(validDto);

      expect(result.data.user.username).toBe('malik');
      expect(result.data.user.avatarInitials).toBe('M');
      expect(result.data.accessToken).toBe(ACCESS_TOKEN);
      expect(result.data.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.meta.accessTokenExpiresIn).toBe(900);
    });

    it('throws USERNAME_ALREADY_EXISTS when username is taken', async () => {
      const service = await makeService({
        tx: { findUnique: jest.fn().mockResolvedValue(mockUser) },
      });

      try {
        await service.registerDevice(validDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('USERNAME_ALREADY_EXISTS');
        expect((error as AuthException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('throws INVALID_PUBLIC_KEY for empty string', async () => {
      const service = await makeService();

      try {
        await service.registerDevice({ ...validDto, publicKey: '' });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_PUBLIC_KEY');
      }
    });
  });

  describe('initiateChallenge', () => {
    it('generates a challenge for a valid user and device', async () => {
      const service = await makeService();
      const result = await service.initiateChallenge({
        username: 'Malik',
        deviceId: 'device-uuid',
      });

      expect(result.data.challengeId).toBe('challenge-uuid');
      expect(result.data.challenge).toBeTruthy();
      expect(typeof result.data.challenge).toBe('string');
      expect(result.data.expiresAt).toBeTruthy();
    });

    it('throws DEVICE_NOT_FOUND when device does not belong to user', async () => {
      const service = await makeService({
        userDeviceFindFirst: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.initiateChallenge({
          username: 'Malik',
          deviceId: 'wrong-device',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('DEVICE_NOT_FOUND');
        expect((error as AuthException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('throws DEVICE_NOT_FOUND when user is inactive', async () => {
      const service = await makeService({
        userDeviceFindFirst: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.initiateChallenge({
          username: 'inactive',
          deviceId: 'device-uuid',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('DEVICE_NOT_FOUND');
      }
    });
  });

  describe('completeChallenge', () => {
    const loginDto = {
      challengeId: 'challenge-uuid',
      signature: SIGNATURE_BASE64URL,
    };

    it('completes challenge and returns tokens', async () => {
      const prisma = buildPrismaService({
        challengeFindUnique: jest.fn().mockResolvedValue(mockChallengeRecord),
      });
      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.completeChallenge(loginDto);

      expect(result.data.user.username).toBe('malik');
      expect(result.data.accessToken).toBe(ACCESS_TOKEN);
      expect(result.data.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.meta.accessTokenExpiresIn).toBe(900);
      expect(prisma.authChallenge.updateMany).toHaveBeenCalledWith({
        where: { id: 'challenge-uuid', consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('throws INVALID_CHALLENGE for unknown challengeId', async () => {
      const service = await makeService({
        challengeFindUnique: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.completeChallenge(loginDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_CHALLENGE');
      }
    });

    it('throws CHALLENGE_EXPIRED for expired challenge', async () => {
      const service = await makeService({
        challengeFindUnique: jest.fn().mockResolvedValue({
          ...mockChallengeRecord,
          expiresAt: new Date(Date.now() - 60000),
        }),
      });

      try {
        await service.completeChallenge(loginDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('CHALLENGE_EXPIRED');
      }
    });

    it('throws CHALLENGE_ALREADY_CONSUMED for used challenge', async () => {
      const prisma = buildPrismaService({
        challengeFindUnique: jest.fn().mockResolvedValue({
          ...mockChallengeRecord,
          consumedAt: new Date(),
        }),
      });
      (prisma.authChallenge.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();

      try {
        await service.completeChallenge(loginDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'CHALLENGE_ALREADY_CONSUMED',
        );
      }
    });

    it('throws INVALID_SIGNATURE when Ed25519 verification fails', async () => {
      (_sodium.crypto_sign_verify_detached as jest.Mock).mockReturnValue(false);

      const service = await makeService({
        challengeFindUnique: jest.fn().mockResolvedValue(mockChallengeRecord),
      });

      try {
        await service.completeChallenge(loginDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_SIGNATURE');
      }
    });

    it('throws USER_INACTIVE when user is not active', async () => {
      const service = await makeService({
        challengeFindUnique: jest.fn().mockResolvedValue(mockChallengeRecord),
        userDeviceFindFirst: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.completeChallenge(loginDto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('USER_INACTIVE');
      }
    });
  });

  describe('refreshToken', () => {
    it('rotates tokens successfully', async () => {
      const tx = createMockTx();
      tx.refreshToken = {
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({
          ...mockRefreshRecord,
          id: 'new-refresh-uuid',
        }),
      } as unknown;

      const prisma = {
        $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
        user: {} as unknown,
        userDevice: {} as unknown,
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockRefreshRecord,
            user: mockUser,
          }),
          update: jest.fn().mockResolvedValue(undefined),
        } as unknown,
        authChallenge: {} as unknown,
      } as unknown as PrismaService;

      const tokenSvc = defaultTokenService();
      const service = new AuthService(prisma, tokenSvc, defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.refreshToken(REFRESH_TOKEN);

      expect(result.accessToken).toBe(ACCESS_TOKEN);
      expect(result.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.accessTokenExpiresIn).toBe(900);
    });

    it('throws INVALID_REFRESH_TOKEN for malformed token', async () => {
      const service = await makeService();

      try {
        await service.refreshToken('no-dot-here');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_REFRESH_TOKEN');
      }
    });
  });

  describe('logout', () => {
    it('revokes a refresh token successfully', async () => {
      const updateSpy = jest.fn().mockResolvedValue(undefined);
      const prisma = {
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue(mockRefreshRecord),
          update: updateSpy,
        } as unknown,
      } as unknown as PrismaService;

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.logout(REFRESH_TOKEN);

      expect(result.message).toBe('Logged out successfully');
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'test-uuid' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('returns success for non-existent token (idempotent)', async () => {
      const prisma = {
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        } as unknown,
      } as unknown as PrismaService;

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.logout(REFRESH_TOKEN);

      expect(result.message).toBe('Logged out successfully');
    });

    it('returns success for malformed token (idempotent)', async () => {
      const service = await makeService();
      const result = await service.logout('bad-token');

      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user payload as-is', async () => {
      const service = await makeService();
      const payload = {
        id: 'user-uuid',
        username: 'malik',
        displayName: 'Malik',
        avatarUrl: null,
        avatarInitials: 'M',
        isActive: true,
        deviceId: 'device-uuid',
        createdAt: '2025-05-29T12:00:00.000Z',
      };
      const result = service.getCurrentUser(payload);
      expect(result).toEqual(payload);
    });
  });

  describe('listDevices', () => {
    const secondDevice = {
      id: 'device-2-uuid',
      userId: 'user-uuid',
      publicKey: 'pk2',
      deviceName: 'iPad Pro',
      platform: 'ios',
      lastSeenAt: null,
      createdAt: new Date('2025-05-28T12:00:00.000Z'),
      updatedAt: new Date('2025-05-28T12:00:00.000Z'),
    };

    it('lists user devices with current device marked', async () => {
      const prisma = buildPrismaService();
      (prisma.userDevice.findMany as jest.Mock).mockResolvedValue([
        mockDevice,
        secondDevice,
      ]);

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.listDevices('user-uuid', 'device-uuid');

      expect(result.data.devices).toHaveLength(2);
      expect(result.data.devices[0].isCurrent).toBe(true);
      expect(result.data.devices[0].id).toBe('device-uuid');
      expect(result.data.devices[1].isCurrent).toBe(false);
      expect(result.data.devices[1].id).toBe('device-2-uuid');
    });

    it('marks no device as current when no match', async () => {
      const prisma = buildPrismaService();
      (prisma.userDevice.findMany as jest.Mock).mockResolvedValue([
        secondDevice,
      ]);

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.listDevices('user-uuid', 'other-device');

      expect(result.data.devices).toHaveLength(1);
      expect(result.data.devices[0].isCurrent).toBe(false);
    });

    it('returns empty list for user with no devices', async () => {
      const prisma = buildPrismaService();
      (prisma.userDevice.findMany as jest.Mock).mockResolvedValue([]);

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.listDevices('user-uuid', 'device-uuid');

      expect(result.data.devices).toEqual([]);
    });
  });

  describe('revokeDevice', () => {
    it('revokes device refresh tokens successfully', async () => {
      const prisma = buildPrismaService();
      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.revokeDevice(
        'user-uuid',
        'device-2-uuid',
        'device-uuid',
      );

      expect(result.message).toBe('Device revoked successfully');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          deviceId: 'device-2-uuid',
          revokedAt: null,
          expiresAt: { gte: expect.any(Date) },
        },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('sets revokedAt on the device record', async () => {
      const prisma = buildPrismaService();
      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      await service.revokeDevice('user-uuid', 'device-2-uuid', 'device-uuid');

      expect(prisma.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-2-uuid' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws CANNOT_REMOVE_CURRENT_DEVICE for current device', async () => {
      const service = await makeService();

      try {
        await service.revokeDevice('user-uuid', 'device-uuid', 'device-uuid');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'CANNOT_REMOVE_CURRENT_DEVICE',
        );
        expect((error as AuthException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('throws DEVICE_NOT_FOUND for non-existent device', async () => {
      const service = await makeService({
        userDeviceFindFirst: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.revokeDevice(
          'user-uuid',
          'nonexistent-device',
          'device-uuid',
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('DEVICE_NOT_FOUND');
        expect((error as AuthException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  describe('reserved usernames', () => {
    it.each(['admin', 'root', 'system', 'support', 'patheo', 'api', 'auth'])(
      'rejects reserved username %s',
      async (reserved) => {
        const service = await makeService();

        try {
          await service.registerDevice({
            ...validDto,
            username: reserved,
          });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AuthException);
          expect((error as AuthException).code).toBe('USERNAME_RESERVED');
        }
      },
    );
  });

  describe('public key size validation', () => {
    it('rejects key shorter than 32 bytes', async () => {
      const service = await makeService();

      try {
        await service.registerDevice({
          ...validDto,
          publicKey: 'YQ==', // 1 byte
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_PUBLIC_KEY');
      }
    });

    it('rejects key longer than 32 bytes', async () => {
      const service = await makeService();

      try {
        await service.registerDevice({
          ...validDto,
          publicKey: 'YSI6ICJlcXVhbCJ9.YSI6ICJlcXVhbCJ9.YSI6ICJlcXVhbCJ9.tw', // > 32 bytes
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_PUBLIC_KEY');
      }
    });

    it('rejects key with invalid base64 chars', async () => {
      const service = await makeService();

      try {
        await service.registerDevice({
          ...validDto,
          publicKey: 'not valid!!!',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_PUBLIC_KEY');
      }
    });
  });

  describe('challenge TOCTOU', () => {
    it('rejects challenge when atomic consume fails (count=0)', async () => {
      const prisma = buildPrismaService({
        challengeFindUnique: jest.fn().mockResolvedValue(mockChallengeRecord),
      });
      (prisma.authChallenge.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();

      try {
        await service.completeChallenge({
          challengeId: 'challenge-uuid',
          signature: SIGNATURE_BASE64URL,
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'CHALLENGE_ALREADY_CONSUMED',
        );
      }
    });
  });

  describe('revoked device blocking', () => {
    it('initiateChallenge filters out revoked devices', async () => {
      const service = await makeService({
        userDeviceFindFirst: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.initiateChallenge({
          username: 'Malik',
          deviceId: 'revoked-device',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('DEVICE_NOT_FOUND');
      }
    });
  });

  describe('cleanupExpiredRecords', () => {
    it('deletes expired challenges and tokens', async () => {
      const prisma = buildPrismaService();
      (prisma.authChallenge.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.cleanupExpiredRecords();

      expect(result.challenges).toBe(5);
      expect(result.refreshTokens).toBe(3);
    });

    it('returns zero counts when nothing to clean', async () => {
      const prisma = buildPrismaService();
      const service = new AuthService(prisma, defaultTokenService(), defaultGoogleAuthService());
      await service.onModuleInit();
      const result = await service.cleanupExpiredRecords();

      expect(result.challenges).toBe(0);
      expect(result.refreshTokens).toBe(0);
    });
  });

  describe('connectGoogleAccount', () => {
    const userId = 'user-uuid';
    const idToken = 'valid-google-id-token';

    const mockGoogleIdentity = {
      sub: 'google-user-123',
      email: 'user@gmail.com',
      emailVerified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    };

    const mockAuthIdentity = {
      id: 'identity-uuid',
      userId: 'user-uuid',
      provider: 'google',
      providerUserId: 'google-user-123',
      email: 'user@gmail.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('links a Google account and returns the identity', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.authIdentity.create as jest.Mock).mockResolvedValue(
        mockAuthIdentity,
      );

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      const result = await service.connectGoogleAccount(userId, idToken);

      expect(result.data).toEqual({
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'user@gmail.com',
      });
      expect(googleAuth.verifyIdToken).toHaveBeenCalledWith(idToken);
      expect(prisma.authIdentity.create).toHaveBeenCalledWith({
        data: {
          userId,
          provider: 'google',
          providerUserId: 'google-user-123',
          email: 'user@gmail.com',
        },
      });
    });

    it('returns idempotent response when same Google account is already linked to same user', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(
        mockAuthIdentity,
      );

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      const result = await service.connectGoogleAccount(userId, idToken);

      expect(result.data).toEqual({
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'user@gmail.com',
      });
      expect(prisma.authIdentity.create).not.toHaveBeenCalled();
    });

    it('throws GOOGLE_ACCOUNT_ALREADY_LINKED when Google account is linked to a different user', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue({
        ...mockAuthIdentity,
        userId: 'other-user-uuid',
      });

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.connectGoogleAccount(userId, idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'GOOGLE_ACCOUNT_ALREADY_LINKED',
        );
        expect((error as AuthException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('throws GOOGLE_EMAIL_NOT_VERIFIED when Google email is not verified', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        ...mockGoogleIdentity,
        emailVerified: false,
      });

      const service = new AuthService(
        buildPrismaService(),
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.connectGoogleAccount(userId, idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'GOOGLE_EMAIL_NOT_VERIFIED',
        );
        expect((error as AuthException).getStatus()).toBe(
          HttpStatus.FORBIDDEN,
        );
      }
    });

    it('handles P2002 race condition — same user (idempotent)', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.8.0' },
      );
      (prisma.authIdentity.create as jest.Mock).mockRejectedValue(p2002Error);

      (prisma.authIdentity.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        mockAuthIdentity,
      );

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      const result = await service.connectGoogleAccount(userId, idToken);

      expect(result.data).toEqual({
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'user@gmail.com',
      });
    });

    it('handles P2002 race condition — different user (conflict)', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.8.0' },
      );
      (prisma.authIdentity.create as jest.Mock).mockRejectedValue(p2002Error);

      (prisma.authIdentity.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...mockAuthIdentity,
        userId: 'other-user-uuid',
      });

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.connectGoogleAccount(userId, idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'GOOGLE_ACCOUNT_ALREADY_LINKED',
        );
      }
    });
  });

  describe('recoverWithGoogle', () => {
    const idToken = 'valid-google-id-token';

    const mockGoogleIdentity = {
      sub: 'google-user-123',
      email: 'user@gmail.com',
      emailVerified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    };

    const mockAuthIdentityWithUser = {
      id: 'identity-uuid',
      userId: 'user-uuid',
      provider: 'google',
      providerUserId: 'google-user-123',
      email: 'user@gmail.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-uuid',
        username: 'malik',
        displayName: 'Malik',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date('2025-05-29'),
        updatedAt: new Date('2025-05-29'),
      },
    };

    it('returns recovery token for valid linked Google account', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const tokenSvc = defaultTokenService();

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(
        mockAuthIdentityWithUser,
      );

      const service = new AuthService(
        prisma,
        tokenSvc,
        googleAuth,
      );
      await service.onModuleInit();

      const result = await service.recoverWithGoogle(idToken);

      expect(result.data.recoveryToken).toBe('signed-recovery-jwt');
      expect(googleAuth.verifyIdToken).toHaveBeenCalledWith(idToken);
      expect(tokenSvc.signRecoveryToken).toHaveBeenCalledWith(
        'user-uuid',
        'account_recovery',
      );
    });

    it('throws GOOGLE_EMAIL_NOT_VERIFIED for unverified email', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue({
        ...mockGoogleIdentity,
        emailVerified: false,
      });

      const service = new AuthService(
        buildPrismaService(),
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.recoverWithGoogle(idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'GOOGLE_EMAIL_NOT_VERIFIED',
        );
        expect((error as AuthException).getStatus()).toBe(
          HttpStatus.FORBIDDEN,
        );
      }
    });

    it('throws GOOGLE_ACCOUNT_NOT_LINKED when no identity exists', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue(null);

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.recoverWithGoogle(idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe(
          'GOOGLE_ACCOUNT_NOT_LINKED',
        );
        expect((error as AuthException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('throws USER_INACTIVE when linked user is inactive', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockResolvedValue(
        mockGoogleIdentity,
      );

      const prisma = buildPrismaService();
      (prisma.authIdentity.findUnique as jest.Mock).mockResolvedValue({
        ...mockAuthIdentityWithUser,
        user: { ...mockAuthIdentityWithUser.user, isActive: false },
      });

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.recoverWithGoogle(idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('USER_INACTIVE');
        expect((error as AuthException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('propagates Google token verification errors', async () => {
      const googleAuth = defaultGoogleAuthService();
      (googleAuth.verifyIdToken as jest.Mock).mockRejectedValue(
        new AuthException(
          'INVALID_GOOGLE_TOKEN',
          'Failed to verify Google ID token',
          HttpStatus.UNAUTHORIZED,
        ),
      );

      const service = new AuthService(
        buildPrismaService(),
        defaultTokenService(),
        googleAuth,
      );
      await service.onModuleInit();

      try {
        await service.recoverWithGoogle(idToken);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_GOOGLE_TOKEN');
      }
    });
  });

  describe('registerDeviceAfterRecovery', () => {
    const authHeader = 'Bearer valid-recovery-token';
    const dto = {
      publicKey: 'IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI',
      deviceName: 'iPhone 17 Pro',
      platform: 'ios',
    };

    it('registers a device and returns challenge data', async () => {
      const tokenSvc = defaultTokenService();
      const prisma = buildPrismaService({
        userFindUnique: jest.fn().mockResolvedValue(mockUser),
      });

      const service = new AuthService(
        prisma,
        tokenSvc,
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      const result = await service.registerDeviceAfterRecovery(
        authHeader,
        dto,
      );

      expect(result.data.deviceId).toBe('device-uuid');
      expect(result.data.challengeId).toBe('challenge-uuid');
      expect(result.data.challenge).toBeTruthy();
      expect(result.data.expiresAt).toBeTruthy();
      expect(tokenSvc.verifyRecoveryToken).toHaveBeenCalledWith(
        'valid-recovery-token',
      );
      expect(prisma.userDevice.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid',
          publicKey: dto.publicKey,
          deviceName: dto.deviceName,
          platform: dto.platform,
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('throws INVALID_RECOVERY_TOKEN when auth header is missing Bearer prefix', async () => {
      const service = new AuthService(
        buildPrismaService(),
        defaultTokenService(),
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      try {
        await service.registerDeviceAfterRecovery('missing-bearer', dto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_RECOVERY_TOKEN');
        expect((error as AuthException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('throws INVALID_RECOVERY_TOKEN when token verification fails', async () => {
      const tokenSvc = defaultTokenService();
      (tokenSvc.verifyRecoveryToken as jest.Mock).mockRejectedValue(
        new Error('jwt expired'),
      );

      const service = new AuthService(
        buildPrismaService(),
        tokenSvc,
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      try {
        await service.registerDeviceAfterRecovery(authHeader, dto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_RECOVERY_TOKEN');
      }
    });

    it('throws INVALID_RECOVERY_TOKEN when purpose is not account_recovery', async () => {
      const tokenSvc = defaultTokenService();
      (tokenSvc.verifyRecoveryToken as jest.Mock).mockResolvedValue({
        sub: 'user-uuid',
        purpose: 'wrong-purpose',
      });

      const service = new AuthService(
        buildPrismaService(),
        tokenSvc,
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      try {
        await service.registerDeviceAfterRecovery(authHeader, dto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_RECOVERY_TOKEN');
      }
    });

    it('throws USER_INACTIVE when user is not found or inactive', async () => {
      const prisma = buildPrismaService({
        userFindUnique: jest.fn().mockResolvedValue({
          ...mockUser,
          isActive: false,
        }),
      });

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      try {
        await service.registerDeviceAfterRecovery(authHeader, dto);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('USER_INACTIVE');
      }
    });

    it('throws INVALID_PUBLIC_KEY when public key is invalid', async () => {
      const prisma = buildPrismaService({
        userFindUnique: jest.fn().mockResolvedValue(mockUser),
      });

      const service = new AuthService(
        prisma,
        defaultTokenService(),
        defaultGoogleAuthService(),
      );
      await service.onModuleInit();

      try {
        await service.registerDeviceAfterRecovery(authHeader, {
          ...dto,
          publicKey: '!!!invalid!!!',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthException);
        expect((error as AuthException).code).toBe('INVALID_PUBLIC_KEY');
      }
    });
  });
});
