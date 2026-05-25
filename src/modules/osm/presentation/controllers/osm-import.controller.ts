import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Internal } from '@/modules/security/decorators/internal.decorator';
import { AppConfig } from '@/config/app.config';
import { OsmImportService } from '../../services/osm-import.service';
import { OsmRouteImportService } from '../../services/osm-route-import.service';
import { OsmQaService } from '../../services/osm-qa.service';
import { OsmImportDto } from '../dto/osm-import.dto';
import { OsmImportResponseDto } from '../dto/osm-import-response.dto';
import { OsmRouteImportDto } from '../dto/osm-route-import.dto';
import { OsmRouteImportResponseDto } from '../dto/osm-route-import-response.dto';
import { OsmRouteShapeImportDto } from '../dto/osm-route-shape-import.dto';
import { OsmRouteShapeImportResponseDto } from '../dto/osm-route-shape-import-response.dto';
import { OsmQaQueryDto } from '../dto/osm-qa-query.dto';
import { OsmQaReportDto } from '../dto/osm-qa-report.dto';
import { OsmCleanupDto } from '../dto/osm-cleanup.dto';
import { OsmCleanupResponseDto } from '../dto/osm-cleanup-response.dto';
import { OsmGeometryMatchDto } from '../dto/osm-geometry-match.dto';
import { OsmGeometryMatchResponseDto } from '../dto/osm-geometry-match-response.dto';
import { OsmGeometryMatcherService } from '../../services/osm-geometry-matcher.service';

@ApiTags('OSM Import')
@ApiSecurity('x-api-key')
@ApiSecurity('internal-service-token')
@Internal()
@Controller('internal/osm')
export class OsmImportController {
  constructor(
    private readonly osmImportService: OsmImportService,
    private readonly osmRouteImportService: OsmRouteImportService,
    private readonly osmQaService: OsmQaService,
    private readonly geometryMatcherService: OsmGeometryMatcherService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  private checkInternalEnabled(): void {
    if (!this.configService.get('enableInternalEndpoints', { infer: true })) {
      throw new ForbiddenException('Internal endpoints are disabled');
    }
  }

  @Post('import/stops')
  async importStops(@Body() dto: OsmImportDto): Promise<OsmImportResponseDto> {
    this.checkInternalEnabled();
    return this.osmImportService.importStops(dto.regionId, dto.bbox);
  }

  @Post('import/routes')
  async importRoutes(
    @Body() dto: OsmRouteImportDto,
  ): Promise<OsmRouteImportResponseDto> {
    this.checkInternalEnabled();
    return this.osmRouteImportService.importRoutes(
      dto.regionId,
      dto.bbox,
      dto.modes,
    );
  }

  @Post('import/route-shapes')
  async importRouteShapes(
    @Body() dto: OsmRouteShapeImportDto,
  ): Promise<OsmRouteShapeImportResponseDto> {
    this.checkInternalEnabled();
    return this.osmRouteImportService.importRouteShapes(
      dto.regionId,
      dto.bbox,
      dto.modes,
    );
  }

  @Get('qa/routes')
  async qaRoutes(@Query() query: OsmQaQueryDto): Promise<OsmQaReportDto> {
    this.checkInternalEnabled();
    return this.osmQaService.runQaChecks(
      query.regionId,
      query.checks,
      query.mode,
      query.isActive,
    );
  }

  @Post('cleanup/routes')
  async cleanupRoutes(
    @Body() dto: OsmCleanupDto,
  ): Promise<OsmCleanupResponseDto> {
    this.checkInternalEnabled();
    return this.osmQaService.runCleanup(
      dto.regionId,
      dto.removeDuplicateStops,
      dto.disableUnusable,
      dto.dryRun,
      dto.disabledChecks,
    );
  }

  @Post('match-gtfs-geometry')
  async matchGtfsGeometry(
    @Body() dto: OsmGeometryMatchDto,
  ): Promise<OsmGeometryMatchResponseDto> {
    this.checkInternalEnabled();
    return this.geometryMatcherService.matchGtfsGeometry(
      dto.regionId,
      dto.confidenceThreshold,
      dto.dryRun ?? false,
      dto.replaceLowQuality ?? true,
    );
  }
}
