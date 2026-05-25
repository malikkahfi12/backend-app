ALTER TABLE "gtfs_routes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "gtfs_stops" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "gtfs_shapes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
