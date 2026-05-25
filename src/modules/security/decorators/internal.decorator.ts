import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { IS_INTERNAL_KEY } from '../constants/security.constants';
import { InternalServiceGuard } from '../guards/internal-service.guard';

export const Internal = () =>
  applyDecorators(
    SetMetadata(IS_INTERNAL_KEY, true),
    UseGuards(InternalServiceGuard),
  );
