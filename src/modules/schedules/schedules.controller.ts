import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { DepartureQueryDto } from './dto/departure-query.dto';
import { DepartureResponseDto } from './dto/departure-response.dto';
import { BatchDepartureRequestDto } from './dto/batch-departure-request.dto';

@ApiTags('Schedules')
@ApiSecurity('x-api-key')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOkResponse({ description: 'Schedules returned.' })
  async getSchedules(@Query() query: ScheduleQueryDto) {
    return this.schedulesService.getSchedules(
      query.stopId,
      query.date,
      query.limit,
    );
  }
}

@ApiTags('Departures')
@ApiSecurity('x-api-key')
@Controller('departures')
export class DeparturesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post('batch')
  @ApiOkResponse({
    description: 'Batch departures returned.',
  })
  async getBatchDepartures(@Body() dto: BatchDepartureRequestDto) {
    const result = await this.schedulesService.getBatchDepartures(
      dto.stops,
      dto.currentTime,
      dto.limit,
    );
    return result;
  }

  @Get()
  @ApiOkResponse({
    description: 'Next departures returned.',
    type: DepartureResponseDto,
    isArray: true,
  })
  async getDepartures(@Query() query: DepartureQueryDto) {
    return this.schedulesService.getDepartures(
      query.stopId,
      query.currentTime,
      query.limit,
      query.routeId,
    );
  }
}
