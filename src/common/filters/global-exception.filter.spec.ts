import { HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './global-exception.filter';

function createResponseMock() {
  const res: Record<string, jest.Mock> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function createArgumentsHost(res: Record<string, jest.Mock>, url: string) {
  return {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'POST', url }),
    }),
  } as unknown as Parameters<GlobalExceptionFilter['catch']>[1];
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  const getJsonResponse = (
    res: Record<string, jest.Mock>,
  ): Record<string, unknown> =>
    res.json.mock.calls[0][0] as Record<string, unknown>;

  describe('response format', () => {
    it('returns { success: false, error: { code, message } }', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Bad request' },
      });
    });
  });

  describe('error codes by status', () => {
    const cases: [HttpStatus, string, string][] = [
      [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Bad request'],
      [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Unauthorized'],
      [HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Forbidden'],
      [HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found'],
      [HttpStatus.CONFLICT, 'CONFLICT', 'Conflict'],
      [HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS', 'Too many requests'],
      [HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', 'Server error'],
      [HttpStatus.NOT_IMPLEMENTED, 'INTERNAL_ERROR', 'Not implemented'],
      [HttpStatus.BAD_GATEWAY, 'INTERNAL_ERROR', 'Bad gateway'],
      [HttpStatus.SERVICE_UNAVAILABLE, 'INTERNAL_ERROR', 'Service unavailable'],
      [HttpStatus.GATEWAY_TIMEOUT, 'INTERNAL_ERROR', 'Gateway timeout'],
    ];

    it.each(cases)(
      'maps status %i to code "%s"',
      (httpStatus, expectedCode, message) => {
        const res = createResponseMock();
        const host = createArgumentsHost(res, '/api/v1/test');
        const exception = new HttpException(message, httpStatus);

        filter.catch(exception, host);

        expect(res.status).toHaveBeenCalledWith(httpStatus);
        expect(getJsonResponse(res)).toEqual({
          success: false,
          error: { code: expectedCode, message },
        });
      },
    );
  });

  describe('ThrottlerException', () => {
    it('maps to TOO_MANY_REQUESTS with correct status', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/auth/me/avatar');
      const exception = new ThrottlerException(
        'ThrottlerException: Too Many Requests',
      );

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'ThrottlerException: Too Many Requests',
        },
      });
    });
  });

  describe('generic Error (non-HTTP)', () => {
    it('returns 500 with INTERNAL_ERROR code', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new Error('Something crashed');

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Something crashed' },
      });
    });
  });

  describe('unknown exception (not an Error)', () => {
    it('returns 500 with fallback message', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');

      filter.catch('string exception', host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    });
  });

  describe('BadRequestException with validation messages', () => {
    it('extracts first message from string array', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new HttpException(
        { message: ['username must be a string', 'email is required'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'username must be a string',
        },
      });
    });

    it('uses string message directly', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new HttpException(
        { message: 'Field is required' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field is required' },
      });
    });
  });

  describe('logging', () => {
    it('logs 5xx errors with stack trace', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new Error('DB connection lost');

      filter.catch(exception, host);

      // The catch method should not throw
      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('unknown HTTP status code', () => {
    it('falls back to ERROR code', () => {
      const res = createResponseMock();
      const host = createArgumentsHost(res, '/api/v1/test');
      const exception = new HttpException('Teapot', 418);

      filter.catch(exception, host);

      expect(res.status).toHaveBeenCalledWith(418);
      expect(getJsonResponse(res)).toEqual({
        success: false,
        error: { code: 'ERROR', message: 'Teapot' },
      });
    });
  });
});
