ALTER TABLE "gtfs_routes"
ADD COLUMN "osm_id" TEXT,
ADD COLUMN "osm_type" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'gtfs',
ADD COLUMN "region_id" TEXT;

CREATE UNIQUE INDEX "gtfs_routes_osm_id_osm_type_key"
ON "gtfs_routes" ("osm_id", "osm_type");

ALTER TABLE "gtfs_routes"
ADD CONSTRAINT "gtfs_routes_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "ms_regions"("id")
ON DELETE SET NULL;

CREATE TABLE "gtfs_route_stops" (
  "id" TEXT NOT NULL,
  "route_id" TEXT NOT NULL,
  "stop_id" TEXT NOT NULL,
  "stop_sequence" INTEGER NOT NULL,

  CONSTRAINT "gtfs_route_stops_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gtfs_route_stops_route_id_stop_sequence_key" UNIQUE ("route_id", "stop_sequence"),
  CONSTRAINT "gtfs_route_stops_route_id_stop_id_key" UNIQUE ("route_id", "stop_id"),
  CONSTRAINT "gtfs_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "gtfs_routes"("id") ON DELETE CASCADE,
  CONSTRAINT "gtfs_route_stops_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "gtfs_stops"("id") ON DELETE RESTRICT
);

CREATE INDEX "gtfs_route_stops_route_id_idx" ON "gtfs_route_stops" ("route_id");
