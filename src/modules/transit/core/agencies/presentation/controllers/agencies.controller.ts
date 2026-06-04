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
import { AgencyService } from '../../application/services/agency.service';
import { CreateAgencyDto } from '../dto/create-agency.dto';
import { AgencyQueryDto } from '../dto/agency-query.dto';
import { AgencyResponseDto } from '../dto/agency-response.dto';
import { toAgencyResponse } from '../mappers/agency.mapper';

@ApiTags('Agencies')
@ApiBearerAuth()
@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agencyService: AgencyService) {}

  @Get()
  @ApiOkResponse({
    description: 'Agencies returned.',
    type: AgencyResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: AgencyQueryDto): Promise<AgencyResponseDto[]> {
    const entities = await this.agencyService.findAll(query);
    return entities.map(toAgencyResponse);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Agency returned.', type: AgencyResponseDto })
  async findById(@Param('id') id: string): Promise<AgencyResponseDto> {
    const entity = await this.agencyService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toAgencyResponse(entity);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Agency created.',
    type: AgencyResponseDto,
  })
  async create(@Body() dto: CreateAgencyDto): Promise<AgencyResponseDto> {
    const entity = await this.agencyService.create(dto);
    return toAgencyResponse(entity);
  }
}
