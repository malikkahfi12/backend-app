import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthException extends HttpException {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, httpStatus);
    this.code = code;
  }
}
