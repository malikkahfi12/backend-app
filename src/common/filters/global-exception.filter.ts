import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

const HTTP_STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
  [HttpStatus.NOT_IMPLEMENTED]: 'INTERNAL_ERROR',
  [HttpStatus.BAD_GATEWAY]: 'INTERNAL_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'INTERNAL_ERROR',
  [HttpStatus.GATEWAY_TIMEOUT]: 'INTERNAL_ERROR',
};

function resolveCode(exception: unknown, status: number): string {
  if (exception instanceof ThrottlerException) {
    return 'TOO_MANY_REQUESTS';
  }
  return HTTP_STATUS_CODE_MAP[status] ?? 'ERROR';
}

function resolveMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const res = exception.getResponse();
    if (typeof res === 'object' && res !== null && 'message' in res) {
      const messages = (res as { message: string | string[] }).message;
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        return messages[0];
      }
      if (typeof messages === 'string') {
        return messages;
      }
    }
    return exception.message;
  }
  if (exception instanceof Error) {
    return exception.message;
  }
  return 'Internal server error';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof ThrottlerException
        ? exception.getStatus()
        : exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const code = resolveCode(exception, status);
    const message = resolveMessage(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        {
          status,
          code,
          method: request.method,
          url: request.url,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        `${request.method} ${request.url} failed`,
      );
    } else {
      this.logger.warn(
        {
          status,
          code,
          method: request.method,
          url: request.url,
        },
        `${request.method} ${request.url} ${status} (${code})`,
      );
    }

    response.status(status).json({
      success: false,
      error: { code, message },
    });

    delete (response as unknown as Record<string, unknown>).err;
    (response as unknown as Record<string, number>).statusCode = 200;
  }
}
