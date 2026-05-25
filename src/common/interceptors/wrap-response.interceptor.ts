import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESPONSE_WRAP_KEY } from '../decorators/skip-response-wrap.decorator';

@Injectable()
export class WrapResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipWrap = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_WRAP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipWrap) return next.handle();

    return next.handle().pipe(
      map((output: unknown) => {
        if (
          output &&
          typeof output === 'object' &&
          !Array.isArray(output) &&
          'data' in (output as Record<string, unknown>)
        ) {
          const obj = output as Record<string, unknown>;
          return {
            success: true,
            data: obj.data,
            meta: obj.meta ?? {},
          };
        }

        return {
          success: true,
          data: output,
          meta: {},
        };
      }),
    );
  }
}
