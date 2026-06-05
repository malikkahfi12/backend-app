import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WrapResponseInterceptor } from './common/interceptors/wrap-response.interceptor';
import { PinoLoggerModule } from './infrastructure/logging/pino-logger.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { SecurityModule } from './modules/security/security.module';
import { TransitCoreModule } from './modules/transit/core/transit-core.module';
import { GtfsModule } from './modules/gtfs/gtfs.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { RoutingModule } from './modules/routing/routing.module';
import { TransitMetadataModule } from './modules/transit-metadata/transit-metadata.module';
import { PlacesModule } from './modules/places/places.module';
import { SearchModule } from './modules/search/search.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PinoLoggerModule,
    DatabaseModule,
    RedisModule,
    SecurityModule,
    AuthModule,
    HealthModule,
    TransitMetadataModule,
    TransitCoreModule,
    GtfsModule,
    SchedulesModule,
    RoutingModule,
    PlacesModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WrapResponseInterceptor,
    },
  ],
})
export class AppModule {}
