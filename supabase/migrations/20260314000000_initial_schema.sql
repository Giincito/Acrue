CREATE EXTENSION IF NOT EXISTS vector;

-- auth helper trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Core
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  settings jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  xp_delta integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Tareas y Proyectos
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  context_tag text,
  status text NOT NULL DEFAULT 'inbox',
  priority integer NOT NULL DEFAULT 2,
  due_at timestamptz,
  completed_at timestamptz,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  source text,
  metadata jsonb,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label text NOT NULL
);

-- Estudio
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  credits integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  target_grade float,
  final_grade float,
  prerequisites uuid[],
  weekly_hours integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  weight float,
  grade float,
  due_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  gcal_event_id text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Finanzas
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  date date NOT NULL,
  source text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  renewal_date date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.saving_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  created_at timestamptz DEFAULT now()
);

-- Despensa y Recetas
CREATE TABLE public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  min_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.store_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  pantry_item_id uuid NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pantry_item_id uuid REFERENCES public.pantry_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric,
  unit text,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  instructions text,
  calories integer,
  diet_tags text[],
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  pantry_item_id uuid NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  unit text NOT NULL
);

CREATE TABLE public.meal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  description text,
  calories integer,
  deleted_at timestamptz,
  logged_at timestamptz DEFAULT now()
);

-- Hábitos
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL,
  days_of_week integer[],
  time_of_day time,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now()
);

-- Calendario, Recordatorios y Cerebro
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  remind_at timestamptz NOT NULL,
  repeat_rule text,
  via_telegram boolean NOT NULL DEFAULT true,
  via_push boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  gcal_event_id text,
  meet_url text,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.note_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notebook_id text NOT NULL,
  note_id text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

-- Wishlist
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric,
  currency text DEFAULT 'ARS',
  store text,
  url text,
  priority integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'wanted',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies allowing users to read and write only their own data
-- For tables that link to other tables without user_id, we need joined checks

CREATE POLICY "Users can manage their own profile" ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Allow individual read/write access" ON public.xp_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.subjects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.saving_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.pantry_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.stores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.shopping_list FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.meal_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.note_embeddings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow individual read/write access" ON public.wishlist_items FOR ALL USING (auth.uid() = user_id);

-- Joins for nested tables
CREATE POLICY "Allow individual read/write access" ON public.task_tags FOR ALL USING (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));
CREATE POLICY "Allow individual read/write access" ON public.assignments FOR ALL USING (subject_id IN (SELECT id FROM public.subjects WHERE user_id = auth.uid()));
CREATE POLICY "Allow individual read/write access" ON public.store_prices FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Allow individual read/write access" ON public.recipe_ingredients FOR ALL USING (recipe_id IN (SELECT id FROM public.recipes WHERE user_id = auth.uid()));
CREATE POLICY "Allow individual read/write access" ON public.habit_logs FOR ALL USING (habit_id IN (SELECT id FROM public.habits WHERE user_id = auth.uid()));
