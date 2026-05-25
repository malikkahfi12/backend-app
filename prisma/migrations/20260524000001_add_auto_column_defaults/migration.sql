ALTER TABLE "gtfs_stops" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "gtfs_stops" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "gtfs_routes" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "gtfs_routes" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "gtfs_trips" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "gtfs_trips" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "gtfs_trips" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "gtfs_stop_times" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "gtfs_calendar_dates" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "gtfs_calendar_dates" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "gtfs_calendar_dates" ALTER COLUMN "updated_at" SET DEFAULT now();
