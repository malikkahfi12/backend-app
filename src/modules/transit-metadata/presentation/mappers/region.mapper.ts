import { RegionEntity } from '../../domain/entities/region.entity';
import { RegionResponseDto } from '../dto/region-response.dto';

export function toRegionResponse(entity: RegionEntity): RegionResponseDto {
  return {
    id: entity.id,
    countryId: entity.countryId,
    code: entity.code,
    name: entity.name,
    timezone: entity.timezone,
    defaultLocale: entity.defaultLocale,
  };
}
