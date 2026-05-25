import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { HealthService } from './application/health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
