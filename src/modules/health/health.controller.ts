import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../security/decorators/public.decorator';
import { HealthService } from './application/health.service';
import type { HealthStatus } from './domain/health-status.type';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'Transit Backend',
        timestamp: '2026-01-01T00:00:00.000Z',
        environment: 'development',
        dependencies: {
          database: {
            status: 'ok',
            postgis: 'enabled',
          },
        },
      },
    },
  })
  getHealth(): Promise<HealthStatus> {
    return this.healthService.getStatus();
  }
}
