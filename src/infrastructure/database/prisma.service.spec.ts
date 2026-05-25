import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    const configService = {
      get: jest.fn(
        () => 'postgresql://transit:transit@localhost:5432/transit_db',
      ),
    } as unknown as ConfigService<AppConfig, true>;

    service = new PrismaService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects when module initializes', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects when module is destroyed', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
