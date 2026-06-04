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
import { CalendarService } from '../../application/services/calendar.service';
import { CreateCalendarDto } from '../dto/create-calendar.dto';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CalendarResponseDto } from '../dto/calendar-response.dto';
import { toCalendarResponse } from '../mappers/calendar.mapper';

@ApiTags('Calendars')
@ApiBearerAuth()
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOkResponse({
    description: 'Calendars returned.',
    type: CalendarResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarResponseDto[]> {
    const entities = await this.calendarService.findAll(query);
    return entities.map(toCalendarResponse);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Calendar returned.',
    type: CalendarResponseDto,
  })
  async findById(@Param('id') id: string): Promise<CalendarResponseDto> {
    const entity = await this.calendarService.findById(id);
    if (!entity) throw new NotFoundException(`Entity not found`);
    return toCalendarResponse(entity);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Calendar created.',
    type: CalendarResponseDto,
  })
  async create(@Body() dto: CreateCalendarDto): Promise<CalendarResponseDto> {
    const entity = await this.calendarService.create(dto);
    return toCalendarResponse(entity);
  }
}
