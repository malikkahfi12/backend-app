import { Global, Module } from '@nestjs/common';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { DevTokenService } from './services/dev-token.service';

@Global()
@Module({
  providers: [DevTokenService, InternalServiceGuard],
  exports: [DevTokenService],
})
export class SecurityModule {}
