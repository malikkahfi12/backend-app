import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './guards/api-key.guard';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { DevTokenService } from './services/dev-token.service';

@Global()
@Module({
  providers: [
    DevTokenService,
    InternalServiceGuard,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [DevTokenService],
})
export class SecurityModule {}
