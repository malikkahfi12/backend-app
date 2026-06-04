import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoutingGraphService } from './graph/routing-graph.service';
import { RoutingSearchService } from './services/routing-search.service';
import { GraphSummaryDto } from './dto/graph-summary.dto';
import { StopConnectionsDto } from './dto/stop-connections.dto';
import { RoutingRequestDto } from './dto/routing-request.dto';
import { RoutingResponseDto } from './dto/routing-response.dto';
import type { RoutingGraphMetadata } from './graph/routing-graph.types';

interface RoutingPlanResponse {
  data: RoutingResponseDto;
  meta: RoutingGraphMetadata;
}

@ApiTags('Routing')
@ApiBearerAuth()
@Controller('routing')
export class RoutingController {
  constructor(
    private readonly routingGraphService: RoutingGraphService,
    private readonly routingSearchService: RoutingSearchService,
  ) {}

  @Post('graph/rebuild')
  @ApiOkResponse({ description: 'Graph rebuilt.', type: GraphSummaryDto })
  async rebuildGraph(): Promise<GraphSummaryDto> {
    return this.routingGraphService.rebuildGraph();
  }

  @Get('graph/summary')
  @ApiOkResponse({
    description: 'Graph summary returned.',
    type: GraphSummaryDto,
  })
  getGraphSummary(): GraphSummaryDto {
    return this.routingGraphService.getGraphSummary();
  }

  @Get('graph/stops/:stopId/connections')
  @ApiOkResponse({
    description: 'Stop connections returned.',
    type: StopConnectionsDto,
  })
  getStopConnections(@Param('stopId') stopId: string): StopConnectionsDto {
    const result = this.routingGraphService.getStopConnections(stopId);
    if (!result) {
      throw new NotFoundException(
        `Stop not found or graph not built: ${stopId}`,
      );
    }
    return result;
  }

  @Get()
  @ApiOkResponse({
    description: 'Route found.',
    type: RoutingResponseDto,
  })
  async findRoute(
    @Query() query: RoutingRequestDto,
  ): Promise<RoutingPlanResponse> {
    if (
      (!query.fromStopId && !query.fromStopName) ||
      (!query.toStopId && !query.toStopName)
    ) {
      throw new NotFoundException(
        'Either fromStopId/fromStopName and toStopId/toStopName must be provided',
      );
    }

    return {
      data:
        query.fromStopId && query.toStopId
          ? await this.routingSearchService.searchRoute(
              query.fromStopId,
              query.toStopId,
              query.departureTimeSeconds,
            )
          : await this.routingSearchService.searchRouteByInputs(query),
      meta: this.routingGraphService.getGraphMetadata(),
    };
  }
}
