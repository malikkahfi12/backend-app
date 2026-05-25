import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { TransitModeService } from '../../application/services/transit-mode.service';
import { CreateTransitModeUseCase } from '../../application/use-cases/create-transit-mode.use-case';
import { CreateTransitModeDto } from '../dto/create-transit-mode.dto';
import { TransitModeResponseDto } from '../dto/transit-mode-response.dto';
import { toTransitModeResponse } from '../mappers/transit-mode.mapper';

@ApiTags('Transit Modes')
@ApiSecurity('x-api-key')
@Controller('transit-modes')
export class TransitModesController {
  constructor(
    private readonly transitModeService: TransitModeService,
    private readonly createTransitModeUseCase: CreateTransitModeUseCase,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Transit modes returned.',
    type: TransitModeResponseDto,
    isArray: true,
  })
  async findAll(): Promise<TransitModeResponseDto[]> {
    const entities = await this.transitModeService.findAll();
    return entities.map(toTransitModeResponse);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Transit mode created.',
    type: TransitModeResponseDto,
  })
  async create(
    @Body() dto: CreateTransitModeDto,
  ): Promise<TransitModeResponseDto> {
    const entity = await this.createTransitModeUseCase.execute(dto);
    return toTransitModeResponse(entity);
  }
}
