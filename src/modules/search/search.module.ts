import { Module } from '@nestjs/common';
import { TransitCoreModule } from '../transit/core/transit-core.module';
import { PlacesModule } from '../places/places.module';
import { SearchController } from './presentation/controllers/search.controller';
import { SearchService } from './services/search.service';

@Module({
  imports: [TransitCoreModule, PlacesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
