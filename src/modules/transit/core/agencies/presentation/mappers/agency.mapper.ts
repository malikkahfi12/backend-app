import { AgencyEntity } from '../../domain/entities/agency.entity';
import { AgencyResponseDto } from '../dto/agency-response.dto';

export function toAgencyResponse(entity: AgencyEntity): AgencyResponseDto {
  return {
    id: entity.id,
    feedSourceId: entity.feedSourceId,
    externalAgencyId: entity.externalAgencyId,
    regionId: entity.regionId,
    operatorId: entity.operatorId,
    name: entity.name,
    slug: entity.slug,
    timezone: entity.timezone,
    language: entity.language,
    phone: entity.phone,
    website: entity.website,
    isActive: entity.isActive,
  };
}
