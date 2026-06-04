import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AppConfig } from '../../../config/app.config';

@Injectable()
export class DevTokenService {
  private readonly internalServiceToken: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.internalServiceToken = this.configService.get('internalServiceToken', {
      infer: true,
    });
  }

  validateInternalToken(value: string): boolean {
    if (!value || !this.internalServiceToken) return false;
    return this.timingSafeCompare(value, this.internalServiceToken);
  }

  maskToken(value: string): string {
    if (!value || value.length <= 8) return '***';
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }

  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
