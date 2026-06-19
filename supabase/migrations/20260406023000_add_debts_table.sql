CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  person text NOT NULL,
  type text NOT NULL CHECK (type IN ('owed_to_me', 'i_owe')),
  total_amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ARS',
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled')),
  due_date date,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);
