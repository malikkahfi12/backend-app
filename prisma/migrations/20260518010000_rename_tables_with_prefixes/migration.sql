ALTER TABLE "countries" RENAME TO "ms_countries";
ALTER TABLE "regions" RENAME TO "ms_regions";
ALTER TABLE "operators" RENAME TO "ms_operators";
ALTER TABLE "transit_modes" RENAME TO "ms_transit_modes";
ALTER TABLE "operator_transit_modes" RENAME TO "ms_operator_modes";
ALTER TABLE "feed_sources" RENAME TO "ms_feed_sources";

ALTER TABLE "agencies" RENAME TO "gtfs_agencies";
ALTER TABLE "routes" RENAME TO "gtfs_routes";
ALTER TABLE "stops" RENAME TO "gtfs_stops";
ALTER TABLE "trips" RENAME TO "gtfs_trips";
ALTER TABLE "stop_times" RENAME TO "gtfs_stop_times";
ALTER TABLE "calendars" RENAME TO "gtfs_calendars";
ALTER TABLE "calendar_dates" RENAME TO "gtfs_calendar_dates";
ALTER TABLE "shapes" RENAME TO "gtfs_shapes";
