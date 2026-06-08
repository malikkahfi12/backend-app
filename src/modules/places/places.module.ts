import { Module } from '@nestjs/common';
import { TransitCoreModule } from '../transit/core/transit-core.module';
import { PlacesController } from './presentation/controllers/places.controller';
import { PlacesService } from './services/places.service';
import { StadiaMapsGeocodingService } from './services/stadiamaps-geocoding.service';

@Module({
  imports: [TransitCoreModule],
  controllers: [PlacesController],
  providers: [PlacesService, StadiaMapsGeocodingService],
  exports: [PlacesService],
})
export class PlacesModule {}
