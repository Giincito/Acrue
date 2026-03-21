ALTER TABLE "public"."tasks"
ADD COLUMN "start_time" time without time zone,
ADD COLUMN "end_time" time without time zone,
ADD COLUMN "is_all_day" boolean DEFAULT false NOT NULL;
