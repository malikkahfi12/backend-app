import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../../config/app.config';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthConfigService } from './auth.config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    DatabaseModule,
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
  providers: [AuthService, AuthConfigService, TokenService, JwtAuthGuard],
  exports: [JwtModule, AuthConfigService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
