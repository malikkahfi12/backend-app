import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { OperatorService } from '../../application/services/operator.service';
import { CreateOperatorUseCase } from '../../application/use-cases/create-operator.use-case';
import { CreateOperatorDto } from '../dto/create-operator.dto';
import { OperatorResponseDto } from '../dto/operator-response.dto';
import { toOperatorResponse } from '../mappers/operator.mapper';

@ApiTags('Operators')
@ApiBearerAuth()
@Controller('operators')
export class OperatorsController {
  constructor(
    private readonly operatorService: OperatorService,
    private readonly createOperatorUseCase: CreateOperatorUseCase,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Operators returned.',
    type: OperatorResponseDto,
    isArray: true,
  })
  async findAll(): Promise<OperatorResponseDto[]> {
    const entities = await this.operatorService.findAll();
    return entities.map(toOperatorResponse);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Operator created.',
    type: OperatorResponseDto,
  })
  async create(@Body() dto: CreateOperatorDto): Promise<OperatorResponseDto> {
    const entity = await this.createOperatorUseCase.execute(dto);
    return toOperatorResponse(entity);
  }
}
