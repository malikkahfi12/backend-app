import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CountryService } from './application/services/country.service';
import { FeedSourceService } from './application/services/feed-source.service';
import { OperatorService } from './application/services/operator.service';
import { RegionService } from './application/services/region.service';
import { TransitModeService } from './application/services/transit-mode.service';
import { CreateCountryUseCase } from './application/use-cases/create-country.use-case';
import { CreateFeedSourceUseCase } from './application/use-cases/create-feed-source.use-case';
import { CreateOperatorUseCase } from './application/use-cases/create-operator.use-case';
import { CreateRegionUseCase } from './application/use-cases/create-region.use-case';
import { CreateTransitModeUseCase } from './application/use-cases/create-transit-mode.use-case';
import { COUNTRY_REPOSITORY } from './domain/repositories/country.repository.interface';
import { FEED_SOURCE_REPOSITORY } from './domain/repositories/feed-source.repository.interface';
import { OPERATOR_REPOSITORY } from './domain/repositories/operator.repository.interface';
import { REGION_REPOSITORY } from './domain/repositories/region.repository.interface';
import { TRANSIT_MODE_REPOSITORY } from './domain/repositories/transit-mode.repository.interface';
import { PrismaCountryRepository } from './infrastructure/repositories/prisma-country.repository';
import { PrismaFeedSourceRepository } from './infrastructure/repositories/prisma-feed-source.repository';
import { PrismaOperatorRepository } from './infrastructure/repositories/prisma-operator.repository';
import { PrismaRegionRepository } from './infrastructure/repositories/prisma-region.repository';
import { PrismaTransitModeRepository } from './infrastructure/repositories/prisma-transit-mode.repository';
import { CountriesController } from './presentation/controllers/countries.controller';
import { FeedSourcesController } from './presentation/controllers/feed-sources.controller';
import { OperatorsController } from './presentation/controllers/operators.controller';
import { RegionsController } from './presentation/controllers/regions.controller';
import { TransitModesController } from './presentation/controllers/transit-modes.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CountriesController,
    RegionsController,
    OperatorsController,
    TransitModesController,
    FeedSourcesController,
  ],
  providers: [
    CountryService,
    RegionService,
    OperatorService,
    TransitModeService,
    FeedSourceService,
    CreateCountryUseCase,
    CreateRegionUseCase,
    CreateOperatorUseCase,
    CreateTransitModeUseCase,
    CreateFeedSourceUseCase,
    {
      provide: COUNTRY_REPOSITORY,
      useClass: PrismaCountryRepository,
    },
    {
      provide: REGION_REPOSITORY,
      useClass: PrismaRegionRepository,
    },
    {
      provide: OPERATOR_REPOSITORY,
      useClass: PrismaOperatorRepository,
    },
    {
      provide: TRANSIT_MODE_REPOSITORY,
      useClass: PrismaTransitModeRepository,
    },
    {
      provide: FEED_SOURCE_REPOSITORY,
      useClass: PrismaFeedSourceRepository,
    },
  ],
})
export class TransitMetadataModule {}
