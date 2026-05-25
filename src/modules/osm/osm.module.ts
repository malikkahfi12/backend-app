import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { OverpassClientService } from './services/overpass-client.service';
import { OsmStopNormalizerService } from './services/osm-stop-normalizer.service';
import { OsmImportService } from './services/osm-import.service';
import { OsmRouteNormalizerService } from './services/osm-route-normalizer.service';
import { OsmRouteImportService } from './services/osm-route-import.service';
import { OsmRouteGeometryService } from './services/osm-route-geometry.service';
import { OsmQaService } from './services/osm-qa.service';
import { GeometryQualityService } from './services/geometry-quality.service';
import { OsmGeometryMatcherService } from './services/osm-geometry-matcher.service';
import { OsmImportController } from './presentation/controllers/osm-import.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OsmImportController],
  providers: [
    OverpassClientService,
    OsmStopNormalizerService,
    OsmImportService,
    OsmRouteNormalizerService,
    OsmRouteImportService,
    OsmRouteGeometryService,
    OsmQaService,
    GeometryQualityService,
    OsmGeometryMatcherService,
  ],
})
export class OsmModule {}
