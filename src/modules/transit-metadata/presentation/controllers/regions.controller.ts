import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RegionService } from '../../application/services/region.service';
import { CreateRegionUseCase } from '../../application/use-cases/create-region.use-case';
import { CreateRegionDto } from '../dto/create-region.dto';
import { RegionResponseDto } from '../dto/region-response.dto';
import { toRegionResponse } from '../mappers/region.mapper';

@ApiTags('Regions')
@ApiSecurity('x-api-key')
@Controller('regions')
export class RegionsController {
  constructor(
    private readonly regionService: RegionService,
    private readonly createRegionUseCase: CreateRegionUseCase,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Regions returned.',
    type: RegionResponseDto,
    isArray: true,
  })
  async findAll(): Promise<RegionResponseDto[]> {
    const entities = await this.regionService.findAll();
    return entities.map(toRegionResponse);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Region created.',
    type: RegionResponseDto,
  })
  async create(@Body() dto: CreateRegionDto): Promise<RegionResponseDto> {
    const entity = await this.createRegionUseCase.execute(dto);
    return toRegionResponse(entity);
  }
}
