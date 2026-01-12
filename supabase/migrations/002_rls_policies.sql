-- Enable Row Level Security on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Canvas policies
CREATE POLICY "Users can view own canvases"
  ON canvases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvases"
  ON canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvases"
  ON canvases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvases"
  ON canvases FOR DELETE
  USING (auth.uid() = user_id);

-- Plan tree policies
CREATE POLICY "Users can view own trees"
  ON plan_trees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trees"
  ON plan_trees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trees"
  ON plan_trees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trees"
  ON plan_trees FOR DELETE
  USING (auth.uid() = user_id);

-- Node policies
CREATE POLICY "Users can view own nodes"
  ON nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nodes"
  ON nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nodes"
  ON nodes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nodes"
  ON nodes FOR DELETE
  USING (auth.uid() = user_id);
