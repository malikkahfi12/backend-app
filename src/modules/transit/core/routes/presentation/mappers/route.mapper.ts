import { RouteEntity } from '../../domain/entities/route.entity';
import { RouteResponseDto } from '../dto/route-response.dto';

export function toRouteResponse(
  entity: RouteEntity,
  geometry?: { type: 'LineString'; coordinates: number[][] } | null,
): RouteResponseDto {
  return {
    id: entity.id,
    feedSourceId: entity.feedSourceId,
    externalRouteId: entity.externalRouteId,
    agencyId: entity.agencyId,
    transitModeId: entity.transitModeId,
    shortName: entity.shortName,
    longName: entity.longName,
    description: entity.description,
    color: entity.color,
    textColor: entity.textColor,
    isActive: entity.isActive,
    osmId: entity.osmId,
    osmType: entity.osmType,
    regionId: entity.regionId,
    geometry: geometry ?? undefined,
    matchedOsmRouteId: entity.matchedOsmRouteId,
    geometrySource: entity.geometrySource,
    geometryConfidenceScore: entity.geometryConfidenceScore,
  };
}
