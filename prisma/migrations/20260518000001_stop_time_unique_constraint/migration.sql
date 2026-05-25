DROP INDEX IF EXISTS "stop_times_trip_id_stop_sequence_idx";

ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_trip_id_stop_sequence_key" UNIQUE ("trip_id", "stop_sequence");
