import { Injectable } from '@nestjs/common';
import {
  MapTilerGeocodingService,
  NormalizedPlaceResult,
  NormalizedReverseResult,
} from './maptiler-geocoding.service';

@Injectable()
export class PlacesService {
  constructor(private readonly geocodingService: MapTilerGeocodingService) {}

  async search(
    query: string,
    opts?: { lat?: number; lng?: number; limit?: number },
  ): Promise<NormalizedPlaceResult[]> {
    return this.geocodingService.search(query, opts);
  }

  async reverse(
    lat: number,
    lng: number,
  ): Promise<NormalizedReverseResult | null> {
    return this.geocodingService.reverse(lat, lng);
  }
}
