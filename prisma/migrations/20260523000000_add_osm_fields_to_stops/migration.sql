ALTER TABLE "gtfs_stops"
ADD COLUMN "osm_id" TEXT,
ADD COLUMN "osm_type" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'gtfs',
ADD COLUMN "mode" TEXT;

CREATE UNIQUE INDEX "gtfs_stops_osm_id_osm_type_key"
ON "gtfs_stops" ("osm_id", "osm_type");
