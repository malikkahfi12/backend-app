CREATE TYPE "OperatorType" AS ENUM ('GOVERNMENT', 'PRIVATE', 'PUBLIC_PRIVATE', 'COMMUNITY');
CREATE TYPE "FeedSourceType" AS ENUM ('GTFS_STATIC', 'GTFS_REALTIME', 'CUSTOM_API', 'MANUAL');
CREATE TYPE "FeedFormat" AS ENUM ('GTFS_ZIP', 'GTFS_REALTIME_PROTOBUF', 'JSON', 'CSV', 'MANUAL');

CREATE TABLE "countries" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regions" (
  "id" TEXT NOT NULL,
  "country_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "default_locale" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operators" (
  "id" TEXT NOT NULL,
  "region_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OperatorType" NOT NULL,
  "website_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transit_modes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "transit_modes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operator_transit_modes" (
  "operator_id" TEXT NOT NULL,
  "transit_mode_id" TEXT NOT NULL,

  CONSTRAINT "operator_transit_modes_pkey" PRIMARY KEY ("operator_id", "transit_mode_id")
);

CREATE TABLE "feed_sources" (
  "id" TEXT NOT NULL,
  "operator_id" TEXT NOT NULL,
  "type" "FeedSourceType" NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT,
  "format" "FeedFormat" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feed_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX "regions_country_id_code_key" ON "regions"("country_id", "code");
CREATE INDEX "regions_country_id_idx" ON "regions"("country_id");
CREATE UNIQUE INDEX "operators_region_id_code_key" ON "operators"("region_id", "code");
CREATE INDEX "operators_region_id_idx" ON "operators"("region_id");
CREATE UNIQUE INDEX "transit_modes_code_key" ON "transit_modes"("code");
CREATE UNIQUE INDEX "operator_transit_modes_operator_id_transit_mode_id_key" ON "operator_transit_modes"("operator_id", "transit_mode_id");
CREATE INDEX "operator_transit_modes_transit_mode_id_idx" ON "operator_transit_modes"("transit_mode_id");
CREATE UNIQUE INDEX "feed_sources_operator_id_type_name_key" ON "feed_sources"("operator_id", "type", "name");
CREATE INDEX "feed_sources_operator_id_idx" ON "feed_sources"("operator_id");

ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operators" ADD CONSTRAINT "operators_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_transit_modes" ADD CONSTRAINT "operator_transit_modes_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operator_transit_modes" ADD CONSTRAINT "operator_transit_modes_transit_mode_id_fkey" FOREIGN KEY ("transit_mode_id") REFERENCES "transit_modes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_sources" ADD CONSTRAINT "feed_sources_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
