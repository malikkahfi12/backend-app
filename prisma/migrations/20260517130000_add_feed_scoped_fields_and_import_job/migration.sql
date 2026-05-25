ALTER TABLE "agencies" ADD COLUMN "feed_source_id" TEXT, ADD COLUMN "external_agency_id" TEXT;
ALTER TABLE "routes" ADD COLUMN "feed_source_id" TEXT, ADD COLUMN "external_route_id" TEXT;
ALTER TABLE "stops" ADD COLUMN "feed_source_id" TEXT, ADD COLUMN "external_stop_id" TEXT;
ALTER TABLE "trips" ADD COLUMN "feed_source_id" TEXT, ADD COLUMN "external_trip_id" TEXT;
ALTER TABLE "calendars" ADD COLUMN "feed_source_id" TEXT;

CREATE INDEX "agencies_feed_source_id_idx" ON "agencies"("feed_source_id");
CREATE INDEX "routes_feed_source_id_idx" ON "routes"("feed_source_id");
CREATE INDEX "stops_feed_source_id_idx" ON "stops"("feed_source_id");
CREATE INDEX "trips_feed_source_id_idx" ON "trips"("feed_source_id");
CREATE INDEX "calendars_feed_source_id_idx" ON "calendars"("feed_source_id");

CREATE UNIQUE INDEX "agencies_feed_source_id_external_agency_id_key" ON "agencies"("feed_source_id", "external_agency_id");
CREATE UNIQUE INDEX "routes_feed_source_id_external_route_id_key" ON "routes"("feed_source_id", "external_route_id");
CREATE UNIQUE INDEX "stops_feed_source_id_external_stop_id_key" ON "stops"("feed_source_id", "external_stop_id");
CREATE UNIQUE INDEX "trips_feed_source_id_external_trip_id_key" ON "trips"("feed_source_id", "external_trip_id");
CREATE UNIQUE INDEX "calendars_feed_source_id_service_id_key" ON "calendars"("feed_source_id", "service_id");

ALTER TABLE "agencies" ADD CONSTRAINT "agencies_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stops" ADD CONSTRAINT "stops_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "feed_source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "summary" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_jobs_feed_source_id_idx" ON "import_jobs"("feed_source_id");

ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
