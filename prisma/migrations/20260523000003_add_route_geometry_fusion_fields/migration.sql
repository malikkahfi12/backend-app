ALTER TABLE "gtfs_routes"
ADD COLUMN "matched_osm_route_id" TEXT,
ADD COLUMN "geometry_source" TEXT NOT NULL DEFAULT 'gtfs',
ADD COLUMN "geometry_confidence_score" DOUBLE PRECISION;

CREATE INDEX "gtfs_routes_matched_osm_route_id_idx"
ON "gtfs_routes" ("matched_osm_route_id");
