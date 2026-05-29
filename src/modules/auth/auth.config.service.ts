import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class AuthConfigService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  getAccessTokenSecret(): string {
    return this.configService.get('auth.accessSecret', { infer: true });
  }

  getAccessTokenExpiry(): string {
    return this.configService.get('auth.accessExpiresIn', { infer: true });
  }

  getRefreshTokenSecret(): string {
    return this.configService.get('auth.refreshSecret', { infer: true });
  }

  getRefreshTokenExpiry(): string {
    return this.configService.get('auth.refreshExpiresIn', { infer: true });
  }
}
