import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { RoutingModule } from '../routing/routing.module';
import { TransitCoreModule } from '../transit/core/transit-core.module';
import { IMPORT_JOB_REPOSITORY } from './domain/repositories/import-job.repository.interface';
import { PrismaImportJobRepository } from './infrastructure/repositories/prisma-import-job.repository';
import { ImportJobService } from './application/services/import-job.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { ImportIntegrityService } from './services/import-integrity.service';
import { GtfsParserService } from './services/gtfs-parser.service';
import { GtfsValidatorService } from './services/gtfs-validator.service';
import { GtfsMapperService } from './services/gtfs-mapper.service';
import { JakartaImportService } from './services/jakarta-import.service';
import { TransitImportService } from './services/transit-import.service';
import { TransitImportController } from './controllers/transit-import.controller';
import { GtfsController } from './controllers/gtfs.controller';
import { GtfsService } from './gtfs.service';
import { GtfsImporterService } from './importer/gtfs-importer.service';
import { GtfsDatabaseImporterService } from './importer/gtfs-database-importer.service';
import { GtfsZipExtractorService } from './importer/gtfs-zip-extractor.service';
import { GtfsFileValidatorService } from './importer/gtfs-file-validator.service';
import { CsvReaderHelper } from './parser/helpers/csv-reader.helper';
import { GtfsRowValidatorHelper } from './parser/helpers/gtfs-row-validator.helper';
import { AgencyParser } from './parser/parsers/agency.parser';
import { StopsParser } from './parser/parsers/stops.parser';
import { RoutesParser } from './parser/parsers/routes.parser';
import { CalendarParser } from './parser/parsers/calendar.parser';
import { TripParser } from './parser/parsers/trip.parser';
import { StopTimeParser } from './parser/parsers/stop-time.parser';
import { CalendarDateParser } from './parser/parsers/calendar-date.parser';
import { ShapeParser } from './parser/parsers/shape.parser';
import { AgencyNormalizer } from './normalizers/agency.normalizer';
import { StopNormalizer } from './normalizers/stop.normalizer';
import { RouteNormalizer } from './normalizers/route.normalizer';
import { CalendarNormalizer } from './normalizers/calendar.normalizer';
import { TripNormalizer } from './normalizers/trip.normalizer';
import { StopTimeNormalizer } from './normalizers/stop-time.normalizer';
import { CalendarDateNormalizer } from './normalizers/calendar-date.normalizer';
import { ShapeNormalizer } from './normalizers/shape.normalizer';
import { GtfsImportMapper } from './mappers/gtfs-import.mapper';
import { GtfsRouteTypeMapper } from './mappers/gtfs-route-type.mapper';

@Module({
  imports: [DatabaseModule, TransitCoreModule, RoutingModule],
  controllers: [TransitImportController, GtfsController],
  providers: [
    GtfsService,
    GtfsImporterService,
    GtfsDatabaseImporterService,
    GtfsZipExtractorService,
    GtfsFileValidatorService,
    GtfsParserService,
    GtfsValidatorService,
    GtfsMapperService,
    JakartaImportService,
    TransitImportService,
    ImportJobService,
    CacheInvalidationService,
    ImportIntegrityService,
    CsvReaderHelper,
    GtfsRowValidatorHelper,
    AgencyParser,
    StopsParser,
    RoutesParser,
    CalendarParser,
    TripParser,
    StopTimeParser,
    CalendarDateParser,
    ShapeParser,
    AgencyNormalizer,
    StopNormalizer,
    RouteNormalizer,
    CalendarNormalizer,
    TripNormalizer,
    StopTimeNormalizer,
    CalendarDateNormalizer,
    ShapeNormalizer,
    GtfsImportMapper,
    GtfsRouteTypeMapper,
    { provide: IMPORT_JOB_REPOSITORY, useClass: PrismaImportJobRepository },
  ],
})
export class GtfsModule {}
