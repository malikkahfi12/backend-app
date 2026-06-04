import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { StopService } from '../../application/services/stop.service';
import { CreateStopDto } from '../dto/create-stop.dto';
import { StopQueryDto } from '../dto/stop-query.dto';
import { StopResponseDto } from '../dto/stop-response.dto';
import { NearbyStopQueryDto } from '../dto/nearby-stop-query.dto';
import { NearbyStopResponseDto } from '../dto/nearby-stop-response.dto';
import { StopRouteDto } from '../dto/stop-route.dto';
import { StopWithDeparturesResponseDto } from '../dto/stop-with-departures-response.dto';
import { SchedulesService } from '../../../../../schedules/schedules.service';
import { toStopResponse } from '../mappers/stop.mapper';
import type { NearbyStopResult } from '../../domain/repositories/stop.repository.interface';

function toNearbyStopResponse(row: NearbyStopResult): NearbyStopResponseDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    latitude: row.latitude,
    longitude: row.longitude,
    locationType: row.locationType,
    isStation: row.isStation,
    distance_meters: row.distance_meters,
  };
}

@ApiTags('Stops')
@ApiBearerAuth()
@Controller('stops')
export class StopsController {
  constructor(
    private readonly stopService: StopService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Get('nearby')
  @ApiOkResponse({
    description: 'Nearby stops returned.',
    type: NearbyStopResponseDto,
    isArray: true,
  })
  async findNearby(
    @Query() query: NearbyStopQueryDto,
  ): Promise<NearbyStopResponseDto[]> {
    const results = await this.stopService.findNearby(
      query.lat,
      query.lng,
      query.radius,
    );
    return results.map(toNearbyStopResponse);
  }

  @Get()
  @ApiOkResponse({
    description: 'Stops returned.',
    type: StopResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: StopQueryDto): Promise<StopResponseDto[]> {
    const entities = await this.stopService.findAll(query);
    return entities.map(toStopResponse);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Stop returned.', type: StopResponseDto })
  async findById(@Param('id') id: string): Promise<StopResponseDto> {
    const entity = await this.stopService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toStopResponse(entity);
  }

  @Get(':id/with-departures')
  @ApiOkResponse({
    description: 'Stop with next departures.',
    type: StopWithDeparturesResponseDto,
  })
  async findWithDepartures(
    @Param('id') id: string,
  ): Promise<StopWithDeparturesResponseDto> {
    const entity = await this.stopService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);

    const departures = await this.schedulesService.getDepartures(
      id,
      undefined,
      10,
    );

    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      slug: entity.slug,
      latitude: entity.latitude,
      longitude: entity.longitude,
      address: entity.address,
      locationType: entity.locationType,
      isStation: entity.isStation,
      departures: departures.data,
    };
  }

  @Get(':stopId/routes')
  @ApiOkResponse({
    description: 'Routes serving this stop.',
    type: StopRouteDto,
    isArray: true,
  })
  async getStopRoutes(
    @Param('stopId') stopId: string,
  ): Promise<StopRouteDto[]> {
    return this.stopService.getStopRoutes(stopId);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Stop created.',
    type: StopResponseDto,
  })
  async create(@Body() dto: CreateStopDto): Promise<StopResponseDto> {
    const entity = await this.stopService.create(dto);
    return toStopResponse(entity);
  }
}
