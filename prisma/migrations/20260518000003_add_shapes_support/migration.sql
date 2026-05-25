ALTER TABLE "trips" ADD COLUMN "external_shape_id" TEXT;

CREATE TABLE "shapes" (
    "id" TEXT NOT NULL,
    "feed_source_id" TEXT,
    "external_shape_id" TEXT NOT NULL,
    "shape_pt_lat" DOUBLE PRECISION NOT NULL,
    "shape_pt_lon" DOUBLE PRECISION NOT NULL,
    "shape_pt_sequence" INTEGER NOT NULL,
    "shape_dist_traveled" DOUBLE PRECISION,

    CONSTRAINT "shapes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shapes_feed_source_id_external_shape_id_shape_pt_sequence_key" ON "shapes"("feed_source_id", "external_shape_id", "shape_pt_sequence");

ALTER TABLE "shapes" ADD CONSTRAINT "shapes_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
