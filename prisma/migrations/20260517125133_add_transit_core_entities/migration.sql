-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'id',
    "phone" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "transit_mode_id" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "text_color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point,4326),
    "address" TEXT,
    "is_station" BOOLEAN NOT NULL DEFAULT false,
    "parent_station_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "headsign" TEXT NOT NULL,
    "direction_id" INTEGER,
    "block_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stop_times" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "arrival_time" TEXT NOT NULL,
    "departure_time" TEXT NOT NULL,
    "pickup_type" INTEGER,
    "drop_off_type" INTEGER,

    CONSTRAINT "stop_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "monday" BOOLEAN NOT NULL DEFAULT false,
    "tuesday" BOOLEAN NOT NULL DEFAULT false,
    "wednesday" BOOLEAN NOT NULL DEFAULT false,
    "thursday" BOOLEAN NOT NULL DEFAULT false,
    "friday" BOOLEAN NOT NULL DEFAULT false,
    "saturday" BOOLEAN NOT NULL DEFAULT false,
    "sunday" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agencies_region_id_idx" ON "agencies"("region_id");

-- CreateIndex
CREATE INDEX "agencies_operator_id_idx" ON "agencies"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_region_id_slug_key" ON "agencies"("region_id", "slug");

-- CreateIndex
CREATE INDEX "routes_agency_id_idx" ON "routes"("agency_id");

-- CreateIndex
CREATE INDEX "routes_transit_mode_id_idx" ON "routes"("transit_mode_id");

-- CreateIndex
CREATE INDEX "stops_region_id_idx" ON "stops"("region_id");

-- CreateIndex
CREATE INDEX "stops_parent_station_id_idx" ON "stops"("parent_station_id");

-- CreateIndex
CREATE UNIQUE INDEX "stops_region_id_slug_key" ON "stops"("region_id", "slug");

-- CreateIndex
CREATE INDEX "trips_route_id_idx" ON "trips"("route_id");

-- CreateIndex
CREATE INDEX "trips_service_id_idx" ON "trips"("service_id");

-- CreateIndex
CREATE INDEX "stop_times_trip_id_idx" ON "stop_times"("trip_id");

-- CreateIndex
CREATE INDEX "stop_times_stop_id_idx" ON "stop_times"("stop_id");

-- CreateIndex
CREATE INDEX "stop_times_trip_id_stop_sequence_idx" ON "stop_times"("trip_id", "stop_sequence");

-- CreateIndex
CREATE INDEX "calendars_service_id_idx" ON "calendars"("service_id");

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_transit_mode_id_fkey" FOREIGN KEY ("transit_mode_id") REFERENCES "transit_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_parent_station_id_fkey" FOREIGN KEY ("parent_station_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostGIS spatial index on stops.location
CREATE INDEX "stops_location_idx" ON "stops" USING GIST ("location");

-- Trigger to auto-populate stops.location from latitude/longitude
CREATE OR REPLACE FUNCTION update_stop_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stop_location
  BEFORE INSERT OR UPDATE ON stops
  FOR EACH ROW EXECUTE FUNCTION update_stop_location();
