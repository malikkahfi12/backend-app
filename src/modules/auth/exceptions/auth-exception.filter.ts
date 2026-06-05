import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthException } from './auth.exception';

@Catch(AuthException, HttpException, Error)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    exception: AuthException | HttpException | Error,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AuthException) {
      response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
        },
      });
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

      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: { code, message },
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: 'ERROR',
          message: exception.message,
        },
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'INVALID_FILE',
        message: exception.message || 'File upload failed',
      },
    });
  }
}
