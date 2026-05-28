import { Injectable } from '@nestjs/common';
import {
  MapboxGeocodingService,
  NormalizedPlaceResult,
  NormalizedReverseResult,
} from './mapbox-geocoding.service';

@Injectable()
export class PlacesService {
  constructor(private readonly geocodingService: MapboxGeocodingService) {}

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
