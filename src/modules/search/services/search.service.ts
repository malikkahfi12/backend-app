import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StopService } from '../../transit/core/stops/application/services/stop.service';
import { PlacesService } from '../../places/services/places.service';
import type { StopEntity } from '../../transit/core/stops/domain/entities/stop.entity';

export interface UnifiedStopResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'stop';
}

export interface UnifiedPlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
  provider: string;
}

export interface UnifiedSearchResponse {
  data: {
    query: string;
    stops: UnifiedStopResult[];
    places: UnifiedPlaceResult[];
  };
  meta: {
    stopCount: number;
    placeCount: number;
    partial: boolean;
  };
}

@Injectable()
export class SearchService {
  constructor(
    private readonly stopService: StopService,
    private readonly placesService: PlacesService,
  ) {}

  async aggregate(
    query: string,
    opts?: { lat?: number; lng?: number; limit?: number; lang?: string },
  ): Promise<UnifiedSearchResponse> {
    const limit = opts?.limit ?? 5;

    const [stopResult, placeResult] = await Promise.allSettled([
      this.stopService.findAll({ q: query }),
      this.placesService.search(query, {
        lat: opts?.lat,
        lng: opts?.lng,
        limit,
        lang: opts?.lang,
      }),
    ]);

    const stops =
      stopResult.status === 'fulfilled'
        ? dedupeByName(stopResult.value.map(mapStopToUnifiedResult))
        : [];

    const places = placeResult.status === 'fulfilled' ? placeResult.value : [];

    const stopFailed = stopResult.status === 'rejected';
    const placeFailed = placeResult.status === 'rejected';
    const partial = stopFailed || placeFailed;

    if (stopFailed && placeFailed) {
      throw new InternalServerErrorException(
        'All search sources are currently unavailable',
      );
    }

    return {
      data: {
        query,
        stops,
        places,
      },
      meta: {
        stopCount: stops.length,
        placeCount: places.length,
        partial,
      },
    };
  }
}

function mapStopToUnifiedResult(stop: StopEntity): UnifiedStopResult {
  return {
    id: stop.id,
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    type: 'stop',
  };
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  return items.filter(
    (item, i, arr) =>
      arr.findIndex((p) => p.name.toLowerCase() === item.name.toLowerCase()) ===
      i,
  );
}
