import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AppConfig } from '../../config/app.config';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { AuthConfigService } from './auth.config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtGlobalGuard } from './guards/jwt-global.guard';
import { TokenService } from './services/token.service';
import { GoogleAuthService } from './services/google-auth.service';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('auth.accessSecret', { infer: true }),
        signOptions: {
          expiresIn: configService.get('auth.accessExpiresIn', {
            infer: true,
          }),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthConfigService,
    TokenService,
    JwtAuthGuard,
    GoogleAuthService,
    JwtGlobalGuard,
    {
      provide: APP_GUARD,
      useClass: JwtGlobalGuard,
    },
  ],
  exports: [
    JwtModule,
    AuthConfigService,
    TokenService,
    JwtAuthGuard,
    GoogleAuthService,
  ],
})
export class AuthModule {}
