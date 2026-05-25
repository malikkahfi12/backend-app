import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiOkResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SearchPlacesQueryDto } from '../dto/search-places-query.dto';
import { ReversePlacesQueryDto } from '../dto/reverse-places-query.dto';
import {
  SearchPlaceResultDto,
  ReversePlaceResultDto,
} from '../dto/place-response.dto';
import { PlacesService } from '../../services/places.service';

@ApiTags('Places')
@ApiSecurity('x-api-key')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  @ApiOkResponse({
    description: 'Search results returned. Empty array if no results.',
    type: SearchPlaceResultDto,
    isArray: true,
  })
  async search(
    @Query() query: SearchPlacesQueryDto,
  ): Promise<SearchPlaceResultDto[]> {
    const results = await this.placesService.search(query.q, {
      lat: query.lat,
      lng: query.lng,
      limit: query.limit,
    });
    return results;
  }

  @Get('reverse')
  @ApiOkResponse({
    description: 'Reverse geocoding result.',
    type: ReversePlaceResultDto,
  })
  async reverse(
    @Query() query: ReversePlacesQueryDto,
  ): Promise<ReversePlaceResultDto> {
    const result = await this.placesService.reverse(query.lat, query.lng);

    if (!result) {
      throw new NotFoundException(
        `No address found for coordinates (${query.lat}, ${query.lng})`,
      );
    }

    return result;
  }
}
