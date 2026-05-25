import { ExecutionContext } from '@nestjs/common';
import { InternalServiceGuard } from './internal-service.guard';
import { DevTokenService } from '../services/dev-token.service';

describe('InternalServiceGuard', () => {
  const createContext = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name.toLowerCase() === 'authorization' ? authorization : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (): InternalServiceGuard => {
    const devTokenService = {
      validateInternalToken: jest.fn(
        (value: string) => value === 'valid-internal-token',
      ),
    } as unknown as DevTokenService;

    return new InternalServiceGuard(devTokenService);
  };

  it('rejects missing bearer token', () => {
    expect(() => createGuard().canActivate(createContext())).toThrow(
      'Missing internal service token',
    );
  });

  it('rejects invalid bearer token', () => {
    expect(() =>
      createGuard().canActivate(createContext('Bearer wrong')),
    ).toThrow('Invalid internal service token');
  });

  it('accepts valid bearer token', () => {
    expect(
      createGuard().canActivate(createContext('Bearer valid-internal-token')),
    ).toBe(true);
  });
});
