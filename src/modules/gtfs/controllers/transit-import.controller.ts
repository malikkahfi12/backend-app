import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiSecurity,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { Internal } from '../../security/decorators/internal.decorator';
import { TransitImportService } from '../services/transit-import.service';
import { ImportRequestDto } from '../dto/import-request.dto';
import { ImportResponseDto } from '../dto/import-response.dto';

@ApiTags('Transit Import')
@ApiBearerAuth()
@ApiSecurity('internal-service-token')
@Internal()
@Controller('internal/transit/import')
export class TransitImportController {
  constructor(private readonly transitImportService: TransitImportService) {}

  @Post('jakarta/:feedSourceId')
  @ApiCreatedResponse({
    description: 'Jakarta GTFS import completed.',
    type: ImportResponseDto,
  })
  async importJakarta(
    @Param('feedSourceId') feedSourceId: string,
    @Body() dto: ImportRequestDto,
  ): Promise<ImportResponseDto> {
    return this.transitImportService.importJakartaFeed(feedSourceId, dto.path);
  }
}
