import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthException } from './auth.exception';

@Catch(AuthException, HttpException, Error)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(
    exception: AuthException | HttpException | Error,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof AuthException) {
      this.logger.warn(
        {
          code: exception.code,
          message: exception.message,
          status: exception.getStatus(),
          method: request.method,
          url: request.url,
        },
        `${request.method} ${request.url} ${exception.getStatus()} (${exception.code})`,
      );

      response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
        },
      });

      delete (response as unknown as Record<string, unknown>).err;
      (response as unknown as Record<string, number>).statusCode = 200;
      return;
    }

    if (exception instanceof BadRequestException) {
      const res = exception.getResponse() as {
        message: string | string[];
      };
      const messages: string[] = Array.isArray(res.message)
        ? res.message
        : [res.message];
      const first = messages[0] ?? 'Validation failed';

      let code = 'VALIDATION_ERROR';
      let message: string;

      if (typeof first === 'string') {
        message = first;
        if (first.toLowerCase().includes('username')) {
          code = 'INVALID_USERNAME';
        } else if (first.toLowerCase().includes('publickey')) {
          code = 'INVALID_PUBLIC_KEY';
          message = 'Invalid public key';
        } else if (first.toLowerCase().includes('refreshtoken')) {
          code = 'INVALID_REFRESH_TOKEN';
          message = 'Invalid refresh token';
        } else if (first.toLowerCase().includes('challengeid')) {
          code = 'INVALID_CHALLENGE';
          message = 'Invalid challenge';
        } else if (first.toLowerCase().includes('signature')) {
          code = 'INVALID_SIGNATURE';
          message = 'Device signature verification failed';
        } else if (first.toLowerCase().includes('deviceid')) {
          code = 'DEVICE_NOT_FOUND';
          message = 'Device not found';
        } else if (
          first.toLowerCase().includes('file') ||
          first.toLowerCase().includes('unsupported')
        ) {
          code = 'INVALID_FILE';
          message = 'Invalid or unsupported file';
        }
      } else {
        message = 'Validation failed';
      }

      this.logger.warn(
        {
          code,
          message,
          status: HttpStatus.BAD_REQUEST,
          method: request.method,
          url: request.url,
        },
        `${request.method} ${request.url} 400 (${code})`,
      );

      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: { code, message },
      });

      delete (response as unknown as Record<string, unknown>).err;
      (response as unknown as Record<string, number>).statusCode = 200;
      return;
    }

    if (exception instanceof HttpException) {
      this.logger.warn(
        {
          code: 'ERROR',
          message: exception.message,
          status: exception.getStatus(),
          method: request.method,
          url: request.url,
        },
        `${request.method} ${request.url} ${exception.getStatus()} (ERROR)`,
      );

      response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: 'ERROR',
          message: exception.message,
        },
      });

      delete (response as unknown as Record<string, unknown>).err;
      (response as unknown as Record<string, number>).statusCode = 200;
      return;
    }

    this.logger.error(
      {
        code: 'INTERNAL_ERROR',
        message: exception.message || 'File upload failed',
        method: request.method,
        url: request.url,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      `${request.method} ${request.url} failed`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: exception.message || 'Internal server error',
      },
    });

    delete (response as unknown as Record<string, unknown>).err;
    (response as unknown as Record<string, number>).statusCode = 200;
  }
}
