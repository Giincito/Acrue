


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."clean_up_trash"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.tasks WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.assignments WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.expenses WHERE deleted_at < now() - interval '7 days';
  DELETE FROM public.meal_log WHERE deleted_at < now() - interval '7 days';
END;
$$;


ALTER FUNCTION "public"."clean_up_trash"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_moodle_creds"("p_user_id" "uuid", "p_key" "text") RETURNS TABLE("username" "text", "password" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pgp_sym_decrypt(encrypted_username, p_key)::text AS username,
    pgp_sym_decrypt(encrypted_password, p_key)::text AS password
  FROM moodle_credentials
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."decrypt_moodle_creds"("p_user_id" "uuid", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_moodle_creds"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM moodle_credentials WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_moodle_creds"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_moodle_creds"("p_user_id" "uuid", "p_username" "text", "p_password" "text", "p_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO moodle_credentials (user_id, encrypted_username, encrypted_password)
  VALUES (
    p_user_id,
    pgp_sym_encrypt(p_username, p_key),
    pgp_sym_encrypt(p_password, p_key)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_username = pgp_sym_encrypt(p_username, p_key),
    encrypted_password = pgp_sym_encrypt(p_password, p_key),
    token = NULL,
    token_expires_at = NULL;
END;
$$;


ALTER FUNCTION "public"."store_moodle_creds"("p_user_id" "uuid", "p_username" "text", "p_password" "text", "p_key" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "weight" double precision,
    "grade" double precision,
    "due_at" timestamp with time zone,
    "completed" boolean DEFAULT false NOT NULL,
    "gcal_event_id" "text",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone,
    "gcal_event_id" "text",
    "meet_url" "text",
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "location" "text"
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_default" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "person" "text" NOT NULL,
    "type" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "paid_amount" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'ARS'::"text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "due_date" "date",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "debts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'settled'::"text"]))),
    CONSTRAINT "debts_type_check" CHECK (("type" = ANY (ARRAY['owed_to_me'::"text", 'i_owe'::"text"])))
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'ARS'::"text" NOT NULL,
    "category_id" "uuid",
    "description" "text",
    "date" "date" NOT NULL,
    "source" "text",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "habit_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."habits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "days_of_week" integer[],
    "time_of_day" time without time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."habits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "recipe_id" "uuid",
    "description" "text",
    "calories" integer,
    "deleted_at" timestamp with time zone,
    "logged_at" timestamp with time zone DEFAULT "now"(),
    "meal_type" "text",
    CONSTRAINT "meal_log_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['desayuno'::"text", 'almuerzo'::"text", 'merienda'::"text", 'cena'::"text", 'snack'::"text"])))
);


ALTER TABLE "public"."meal_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moodle_credentials" (
    "user_id" "uuid" NOT NULL,
    "encrypted_username" "bytea" NOT NULL,
    "encrypted_password" "bytea" NOT NULL,
    "token" "text",
    "token_expires_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."moodle_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moodle_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "moodle_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "course_name" "text",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text",
    "event_date" timestamp with time zone,
    "ai_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_completed" boolean DEFAULT false NOT NULL,
    "user_notes" "text",
    "parent_moodle_id" integer,
    CONSTRAINT "moodle_events_type_check" CHECK (("type" = ANY (ARRAY['assignment'::"text", 'quiz'::"text", 'forum'::"text", 'resource'::"text"])))
);


ALTER TABLE "public"."moodle_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."note_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notebook_id" "text" NOT NULL,
    "note_id" "text" NOT NULL,
    "content_hash" "text" NOT NULL,
    "embedding" "public"."vector"(768),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."note_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pantry_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "unit" "text" NOT NULL,
    "min_stock" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "low_stock_alerted" boolean DEFAULT false
);


ALTER TABLE "public"."pantry_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "due_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "icon" character varying(50) DEFAULT NULL::character varying,
    "color" character varying(20) DEFAULT NULL::character varying
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "pantry_item_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" NOT NULL
);


ALTER TABLE "public"."recipe_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "instructions" "text",
    "calories" integer,
    "diet_tags" "text"[],
    "is_favorite" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text"
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "trigger_at" timestamp with time zone NOT NULL,
    "repeat_rule" "text",
    "via_telegram" boolean DEFAULT true NOT NULL,
    "via_push" boolean DEFAULT false NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "color" "text" DEFAULT '#ffedd5'::"text",
    "gcal_event_id" "text",
    "trigger_end_at" timestamp with time zone,
    "is_all_day" boolean DEFAULT false
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saving_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0 NOT NULL,
    "deadline" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saving_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pantry_item_id" "uuid",
    "name" "text" NOT NULL,
    "quantity" numeric,
    "unit" "text",
    "checked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auto_generated" boolean DEFAULT false,
    "note" "text"
);


ALTER TABLE "public"."shopping_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "pantry_item_id" "uuid" NOT NULL,
    "price" numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "commission" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "target_grade" double precision,
    "final_grade" double precision,
    "prerequisites" "uuid"[],
    "weekly_hours" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "enrollment_open_date" timestamp with time zone,
    "schedules" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'ARS'::"text" NOT NULL,
    "renewal_date" "date" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."task_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "title" "text" NOT NULL,
    "context_tag" "text",
    "status" "text" DEFAULT 'inbox'::"text" NOT NULL,
    "priority" integer DEFAULT 2 NOT NULL,
    "due_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurrence_rule" "text",
    "source" "text",
    "metadata" "jsonb",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_all_day" boolean DEFAULT false NOT NULL,
    "color" "text",
    "university_type" "text",
    "gcal_event_id" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "settings" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "telegram_chat_id" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric,
    "currency" "text" DEFAULT 'ARS'::"text",
    "store" "text",
    "url" "text",
    "priority" integer DEFAULT 2 NOT NULL,
    "status" "text" DEFAULT 'wanted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wishlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xp_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "xp_delta" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."xp_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."habits"
    ADD CONSTRAINT "habits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_log"
    ADD CONSTRAINT "meal_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moodle_credentials"
    ADD CONSTRAINT "moodle_credentials_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."moodle_events"
    ADD CONSTRAINT "moodle_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moodle_events"
    ADD CONSTRAINT "moodle_events_user_id_moodle_id_type_key" UNIQUE ("user_id", "moodle_id", "type");



ALTER TABLE ONLY "public"."note_embeddings"
    ADD CONSTRAINT "note_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pantry_items"
    ADD CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_prices"
    ADD CONSTRAINT "store_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xp_events"
    ADD CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "calendar_events_gcal_event_id_unique" ON "public"."calendar_events" USING "btree" ("gcal_event_id") WHERE ("gcal_event_id" IS NOT NULL);



CREATE INDEX "idx_expenses_deleted_at" ON "public"."expenses" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_moodle_events_date" ON "public"."moodle_events" USING "btree" ("event_date" DESC);



CREATE INDEX "idx_moodle_events_user_id" ON "public"."moodle_events" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_deleted_at" ON "public"."tasks" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habit_logs"
    ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."habits"
    ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_log"
    ADD CONSTRAINT "meal_log_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_log"
    ADD CONSTRAINT "meal_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moodle_credentials"
    ADD CONSTRAINT "moodle_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moodle_events"
    ADD CONSTRAINT "moodle_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."note_embeddings"
    ADD CONSTRAINT "note_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pantry_items"
    ADD CONSTRAINT "pantry_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pantry_item_id_fkey" FOREIGN KEY ("pantry_item_id") REFERENCES "public"."pantry_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saving_goals"
    ADD CONSTRAINT "saving_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_pantry_item_id_fkey" FOREIGN KEY ("pantry_item_id") REFERENCES "public"."pantry_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_prices"
    ADD CONSTRAINT "store_prices_pantry_item_id_fkey" FOREIGN KEY ("pantry_item_id") REFERENCES "public"."pantry_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_prices"
    ADD CONSTRAINT "store_prices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_tags"
    ADD CONSTRAINT "task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_items"
    ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_events"
    ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow individual read/write access" ON "public"."assignments" USING (("subject_id" IN ( SELECT "subjects"."id"
   FROM "public"."subjects"
  WHERE ("subjects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow individual read/write access" ON "public"."calendar_events" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."categories" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."expenses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."habit_logs" USING (("habit_id" IN ( SELECT "habits"."id"
   FROM "public"."habits"
  WHERE ("habits"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow individual read/write access" ON "public"."habits" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."meal_log" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."note_embeddings" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."pantry_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."projects" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."recipe_ingredients" USING (("recipe_id" IN ( SELECT "recipes"."id"
   FROM "public"."recipes"
  WHERE ("recipes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow individual read/write access" ON "public"."recipes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."reminders" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."saving_goals" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."shopping_list" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."store_prices" USING (("store_id" IN ( SELECT "stores"."id"
   FROM "public"."stores"
  WHERE ("stores"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow individual read/write access" ON "public"."stores" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."subjects" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."subscriptions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."task_tags" USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow individual read/write access" ON "public"."tasks" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."wishlist_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow individual read/write access" ON "public"."xp_events" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own debts" ON "public"."debts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own moodle credentials" ON "public"."moodle_credentials" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own debts" ON "public"."debts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own moodle credentials" ON "public"."moodle_credentials" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own moodle events" ON "public"."moodle_events" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own profile" ON "public"."users" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own debts" ON "public"."debts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own moodle credentials" ON "public"."moodle_credentials" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own debts" ON "public"."debts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own moodle credentials" ON "public"."moodle_credentials" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."habits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moodle_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moodle_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."note_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pantry_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saving_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."xp_events" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_up_trash"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_up_trash"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_up_trash"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_moodle_creds"("p_user_id" "uuid", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_moodle_creds"("p_user_id" "uuid", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_moodle_creds"("p_user_id" "uuid", "p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_moodle_creds"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_moodle_creds"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_moodle_creds"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."store_moodle_creds"("p_user_id" "uuid", "p_username" "text", "p_password" "text", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_moodle_creds"("p_user_id" "uuid", "p_username" "text", "p_password" "text", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_moodle_creds"("p_user_id" "uuid", "p_username" "text", "p_password" "text", "p_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."habit_logs" TO "anon";
GRANT ALL ON TABLE "public"."habit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."habit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."habits" TO "anon";
GRANT ALL ON TABLE "public"."habits" TO "authenticated";
GRANT ALL ON TABLE "public"."habits" TO "service_role";



GRANT ALL ON TABLE "public"."meal_log" TO "anon";
GRANT ALL ON TABLE "public"."meal_log" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_log" TO "service_role";



GRANT ALL ON TABLE "public"."moodle_credentials" TO "anon";
GRANT ALL ON TABLE "public"."moodle_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."moodle_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."moodle_events" TO "anon";
GRANT ALL ON TABLE "public"."moodle_events" TO "authenticated";
GRANT ALL ON TABLE "public"."moodle_events" TO "service_role";



GRANT ALL ON TABLE "public"."note_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."note_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."note_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."pantry_items" TO "anon";
GRANT ALL ON TABLE "public"."pantry_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pantry_items" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."saving_goals" TO "anon";
GRANT ALL ON TABLE "public"."saving_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."saving_goals" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_list" TO "anon";
GRANT ALL ON TABLE "public"."shopping_list" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_list" TO "service_role";



GRANT ALL ON TABLE "public"."store_prices" TO "anon";
GRANT ALL ON TABLE "public"."store_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."store_prices" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."task_tags" TO "anon";
GRANT ALL ON TABLE "public"."task_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."task_tags" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."xp_events" TO "anon";
GRANT ALL ON TABLE "public"."xp_events" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







