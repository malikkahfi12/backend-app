import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { DevTokenService } from '../services/dev-token.service';

describe('ApiKeyGuard', () => {
  const createContext = (apiKey?: string): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name.toLowerCase() === 'x-api-key' ? apiKey : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (isPublic = false): ApiKeyGuard => {
    const reflector = {
      getAllAndOverride: jest.fn(() => isPublic),
    } as unknown as Reflector;
    const devTokenService = {
      validateApiKey: jest.fn((value: string) => value === 'valid-api-key'),
    } as unknown as DevTokenService;

    return new ApiKeyGuard(reflector, devTokenService);
  };

  it('allows @Public() route without API key', () => {
    expect(createGuard(true).canActivate(createContext())).toBe(true);
  });

  it('rejects missing API key', () => {
    expect(() => createGuard().canActivate(createContext())).toThrow(
      'Invalid or missing API key',
    );
  });

  it('rejects invalid API key', () => {
    expect(() => createGuard().canActivate(createContext('wrong'))).toThrow(
      'Invalid or missing API key',
    );
  });

  it('accepts valid API key', () => {
    expect(createGuard().canActivate(createContext('valid-api-key'))).toBe(
      true,
    );
  });
});
