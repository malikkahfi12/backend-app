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
import { StopTimeService } from '../../application/services/stop-time.service';
import { CreateStopTimeDto } from '../dto/create-stop-time.dto';
import { StopTimeQueryDto } from '../dto/stop-time-query.dto';
import { StopTimeResponseDto } from '../dto/stop-time-response.dto';
import { toStopTimeResponse } from '../mappers/stop-time.mapper';

@ApiTags('Stop Times')
@ApiBearerAuth()
@Controller('stop-times')
export class StopTimesController {
  constructor(private readonly stopTimeService: StopTimeService) {}

  @Get()
  @ApiOkResponse({
    description: 'Stop times returned.',
    type: StopTimeResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() query: StopTimeQueryDto,
  ): Promise<StopTimeResponseDto[]> {
    const entities = await this.stopTimeService.findAll(query);
    return entities.map(toStopTimeResponse);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Stop time returned.',
    type: StopTimeResponseDto,
  })
  async findById(@Param('id') id: string): Promise<StopTimeResponseDto> {
    const entity = await this.stopTimeService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toStopTimeResponse(entity);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Stop time created.',
    type: StopTimeResponseDto,
  })
  async create(@Body() dto: CreateStopTimeDto): Promise<StopTimeResponseDto> {
    const entity = await this.stopTimeService.create(dto);
    return toStopTimeResponse(entity);
  }
}
