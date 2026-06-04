import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { UnifiedSearchQueryDto } from '../dto/unified-search-query.dto';
import { SearchService } from '../../services/search.service';

class UnifiedStopResponse {
  id!: string;
  name!: string;
  latitude!: number;
  longitude!: number;
  type!: 'stop';
}

class UnifiedPlaceResponse {
  id!: string;
  name!: string;
  address!: string;
  latitude!: number;
  longitude!: number;
  type!: string;
  provider!: string;
}

class SearchResultDto {
  query!: string;
  stops!: UnifiedStopResponse[];
  places!: UnifiedPlaceResponse[];
}

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@ApiExtraModels(SearchResultDto)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOkResponse({
    description:
      'Unified search results from transit stops and geocoded places.',
    schema: {
      example: {
        query: 'bandung',
        stops: [
          {
            id: 'uuid-...',
            name: 'Bandung Station',
            latitude: -6.914,
            longitude: 107.609,
            type: 'stop',
          },
        ],
        places: [
          {
            id: 'place:12345',
            name: 'Gedung Sate',
            address: 'Bandung, Jawa Barat, Indonesia',
            latitude: -6.902,
            longitude: 107.618,
            type: 'poi',
            provider: 'stadiamaps',
          },
        ],
        meta: {
          stopCount: 1,
          placeCount: 1,
          partial: false,
        },
      },
    },
  })
  async search(@Query() query: UnifiedSearchQueryDto) {
    return this.searchService.aggregate(query.q, {
      lat: query.lat,
      lng: query.lng,
      limit: query.limit,
    });
  }
}
