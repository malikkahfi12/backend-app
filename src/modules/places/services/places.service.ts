import { Injectable, NotFoundException } from '@nestjs/common';
import {
  StadiaMapsGeocodingService,
  NormalizedPlaceResult,
  NormalizedReverseResult,
  ExploreBBox,
  ExplorePlaceItem,
} from './stadiamaps-geocoding.service';
import { StopService } from '../../transit/core/stops/application/services/stop.service';

const NEAREST_STOP_RADIUS = 1000;

export interface PlaceDetailResult extends ExplorePlaceItem {
  nearestStop: {
    id: string;
    name: string;
    distanceMeters: number;
  } | null;
  actions: {
    canRoute: boolean;
  };
}

@Injectable()
export class PlacesService {
  constructor(
    private readonly geocodingService: StadiaMapsGeocodingService,
    private readonly stopService: StopService,
  ) {}

  async search(
    query: string,
    opts?: {
      lat?: number;
      lng?: number;
      limit?: number;
      lang?: string;
      bbox?: ExploreBBox;
      layers?: string;
    },
  ): Promise<NormalizedPlaceResult[]> {
    return this.geocodingService.search(query, opts);
  }

  async reverse(
    lat: number,
    lng: number,
  ): Promise<NormalizedReverseResult | null> {
    return this.geocodingService.reverse(lat, lng);
  }

  async searchPlaces(
    query: string,
    opts?: {
      lat?: number;
      lng?: number;
      limit?: number;
      lang?: string;
      bbox?: ExploreBBox;
    },
  ): Promise<ExplorePlaceItem[]> {
    return this.geocodingService.searchPlaces(query, opts);
  }

  async explore(
    bbox: ExploreBBox,
    category?: string,
    limit?: number,
  ): Promise<ExplorePlaceItem[]> {
    return this.geocodingService.explore(bbox, category, limit);
  }

  async getDetail(id: string): Promise<PlaceDetailResult> {
    const place = await this.geocodingService.getPlaceDetail(id);

    if (!place) {
      throw new NotFoundException(`Place not found for id: "${id}"`);
    }

    const [stops] = await Promise.allSettled([
      this.stopService.findNearby(place.lat, place.lng, NEAREST_STOP_RADIUS),
    ]);

    const firstStop =
      stops.status === 'fulfilled' ? (stops.value[0] ?? null) : null;

    const nearestStop = firstStop
      ? {
          id: firstStop.id,
          name: firstStop.name,
          distanceMeters: Math.round(firstStop.distance_meters * 10) / 10,
        }
      : null;

    return {
      ...place,
      nearestStop,
      actions: {
        canRoute: nearestStop !== null,
      },
    };
  }
}
