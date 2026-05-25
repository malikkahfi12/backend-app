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
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { TripService } from '../../application/services/trip.service';
import { CreateTripDto } from '../dto/create-trip.dto';
import { TripQueryDto } from '../dto/trip-query.dto';
import { TripResponseDto } from '../dto/trip-response.dto';
import { TripStopDto } from '../dto/trip-stop.dto';
import { toTripResponse } from '../mappers/trip.mapper';

@ApiTags('Trips')
@ApiSecurity('x-api-key')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripService: TripService) {}

  @Get()
  @ApiOkResponse({
    description: 'Trips returned.',
    type: TripResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: TripQueryDto): Promise<TripResponseDto[]> {
    const entities = await this.tripService.findAll(query);
    return entities.map(toTripResponse);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Trip returned.', type: TripResponseDto })
  async findById(@Param('id') id: string): Promise<TripResponseDto> {
    const entity = await this.tripService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toTripResponse(entity);
  }

  @Get(':tripId/stops')
  @ApiOkResponse({
    description: 'Trip stops returned.',
    type: TripStopDto,
    isArray: true,
  })
  async getTripStops(@Param('tripId') tripId: string): Promise<TripStopDto[]> {
    const stops = await this.tripService.getTripStops(tripId);
    if (stops.length === 0)
      throw new NotFoundException(`Trip not found or has no stops`);
    return stops;
  }

  @Get(':tripId/shape')
  @ApiOkResponse({
    description: 'Trip shape returned as GeoJSON LineString.',
  })
  async getTripShape(
    @Param('tripId') tripId: string,
  ): Promise<{ type: string; coordinates: number[][] } | null> {
    const shape = await this.tripService.getTripShape(tripId);
    if (!shape) throw new NotFoundException(`Trip not found or has no shape`);
    return shape;
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Trip created.',
    type: TripResponseDto,
  })
  async create(@Body() dto: CreateTripDto): Promise<TripResponseDto> {
    const entity = await this.tripService.create(dto);
    return toTripResponse(entity);
  }
}
