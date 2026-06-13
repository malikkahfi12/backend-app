import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiOkResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchPlacesQueryDto } from '../dto/search-places-query.dto';
import { ReversePlacesQueryDto } from '../dto/reverse-places-query.dto';
import { ExplorePlacesQueryDto } from '../dto/explore-places-query.dto';
import { ExplorePlaceItemDto } from '../dto/explore-place-item.dto';
import { PlaceDetailQueryDto } from '../dto/place-detail-query.dto';
import { PlaceDetailResponseDto } from '../dto/place-detail-response.dto';
import { ReversePlaceResultDto } from '../dto/place-response.dto';
import { PlacesService } from '../../services/places.service';

@ApiTags('Places')
@ApiBearerAuth()
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  @ApiOkResponse({
    description: 'Search places/POIs globally. Empty array if no results.',
    type: ExplorePlaceItemDto,
    isArray: true,
  })
  async search(@Query() query: SearchPlacesQueryDto): Promise<{
    data: ExplorePlaceItemDto[];
    meta: { query: string; count: number };
  }> {
    const items = await this.placesService.searchPlaces(query.q, {
      lat: query.lat,
      lng: query.lng,
      limit: query.limit,
      lang: query.lang,
      bbox: query.parsedBbox ?? undefined,
    });

    return {
      data: items,
      meta: { query: query.q, count: items.length },
    };
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

  @Get('explore')
  @ApiOkResponse({
    description: 'Explore places/POIs within a bounding box.',
    type: ExplorePlaceItemDto,
    isArray: true,
  })
  async explore(@Query() query: ExplorePlacesQueryDto): Promise<{
    data: ExplorePlaceItemDto[];
    meta: { bbox: string; count: number };
  }> {
    const bbox = query.parsedBbox;
    const items = await this.placesService.explore(
      bbox,
      query.category,
      query.limit,
    );

    return {
      data: items,
      meta: { bbox: query.bbox, count: items.length },
    };
  }

  @Get('detail')
  @ApiOkResponse({
    description:
      'Get place detail by Stadia Maps GID with nearest transit stop enrichment.',
    type: PlaceDetailResponseDto,
  })
  async detail(
    @Query() query: PlaceDetailQueryDto,
  ): Promise<{ data: PlaceDetailResponseDto }> {
    const result = await this.placesService.getDetail(query.id);

    return { data: result };
  }
}
