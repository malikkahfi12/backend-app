import { Module } from '@nestjs/common';
import { PlacesController } from './presentation/controllers/places.controller';
import { PlacesService } from './services/places.service';
import { MapboxGeocodingService } from './services/mapbox-geocoding.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, MapboxGeocodingService],
  exports: [PlacesService],
})
export class PlacesModule {}
