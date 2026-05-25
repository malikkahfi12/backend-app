ALTER TABLE "trips" ADD COLUMN "region_id" TEXT;
ALTER TABLE "trips" ADD COLUMN "operator_id" TEXT;

ALTER TABLE "calendars" ADD COLUMN "region_id" TEXT;
ALTER TABLE "calendars" ADD COLUMN "operator_id" TEXT;

CREATE TABLE "calendar_dates" (
    "id" TEXT NOT NULL,
    "feed_source_id" TEXT,
    "service_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "exception_type" INTEGER NOT NULL,
    "region_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_dates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trips_region_id_idx" ON "trips"("region_id");
CREATE INDEX "trips_operator_id_idx" ON "trips"("operator_id");
CREATE UNIQUE INDEX "trips_external_trip_id_operator_id_key" ON "trips"("external_trip_id", "operator_id");

CREATE INDEX "calendars_region_id_idx" ON "calendars"("region_id");
CREATE INDEX "calendars_operator_id_idx" ON "calendars"("operator_id");
CREATE UNIQUE INDEX "calendars_service_id_operator_id_key" ON "calendars"("service_id", "operator_id");

CREATE INDEX "calendar_dates_service_id_idx" ON "calendar_dates"("service_id");
CREATE INDEX "calendar_dates_operator_id_idx" ON "calendar_dates"("operator_id");
CREATE UNIQUE INDEX "calendar_dates_service_id_date_operator_id_key" ON "calendar_dates"("service_id", "date", "operator_id");

ALTER TABLE "trips" ADD CONSTRAINT "trips_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "calendars" ADD CONSTRAINT "calendars_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
