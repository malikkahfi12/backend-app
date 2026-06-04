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
import { RouteService } from '../../application/services/route.service';
import { CreateRouteDto } from '../dto/create-route.dto';
import { RouteQueryDto } from '../dto/route-query.dto';
import { RouteResponseDto } from '../dto/route-response.dto';
import { toRouteResponse } from '../mappers/route.mapper';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
export class RoutesController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  @ApiOkResponse({
    description: 'Routes returned.',
    type: RouteResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() query: RouteQueryDto,
  ): Promise<
    | RouteResponseDto[]
    | { data: RouteResponseDto[]; meta: Record<string, unknown> }
  > {
    if (query.limit !== undefined || query.page !== undefined) {
      const paginated = await this.routeService.findAllPaginated(query, {
        limit: query.limit ?? 20,
        page: query.page ?? 1,
      });
      return {
        data: paginated.data.map((e) => toRouteResponse(e)),
        meta: paginated.meta as unknown as Record<string, unknown>,
      };
    }

    const entities = await this.routeService.findAll(query);
    return entities.map((e) => toRouteResponse(e));
  }

  @Get(':id/stops')
  @ApiOkResponse({ description: 'Route stops returned.' })
  async getRouteStops(@Param('id') id: string) {
    return this.routeService.getRouteStops(id);
  }

  @Get(':id/shape')
  @ApiOkResponse({
    description: 'Route shape returned as polyline6-encoded string.',
  })
  async getRouteShape(@Param('id') id: string): Promise<string | null> {
    const shape = await this.routeService.getRouteShape(id);
    if (!shape) throw new NotFoundException(`Route not found or has no shape`);
    return shape;
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Route returned.', type: RouteResponseDto })
  async findById(@Param('id') id: string): Promise<RouteResponseDto> {
    const entity = await this.routeService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toRouteResponse(entity);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Route created.',
    type: RouteResponseDto,
  })
  async create(@Body() dto: CreateRouteDto): Promise<RouteResponseDto> {
    const entity = await this.routeService.create(dto);
    return toRouteResponse(entity);
  }
}
