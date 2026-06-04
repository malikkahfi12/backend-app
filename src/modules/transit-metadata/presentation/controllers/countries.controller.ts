import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { CountryService } from '../../application/services/country.service';
import { CreateCountryUseCase } from '../../application/use-cases/create-country.use-case';
import { CreateCountryDto } from '../dto/create-country.dto';
import { CountryResponseDto } from '../dto/country-response.dto';
import { toCountryResponse } from '../mappers/country.mapper';

@ApiTags('Countries')
@ApiBearerAuth()
@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countryService: CountryService,
    private readonly createCountryUseCase: CreateCountryUseCase,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Countries returned.',
    type: CountryResponseDto,
    isArray: true,
  })
  async findAll(): Promise<CountryResponseDto[]> {
    const entities = await this.countryService.findAll();
    return entities.map(toCountryResponse);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Country created.',
    type: CountryResponseDto,
  })
  async create(@Body() dto: CreateCountryDto): Promise<CountryResponseDto> {
    const entity = await this.createCountryUseCase.execute(dto);
    return toCountryResponse(entity);
  }
}
