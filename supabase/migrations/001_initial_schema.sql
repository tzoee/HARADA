-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for node status
CREATE TYPE node_status AS ENUM ('done', 'in_progress', 'blocked');

-- Enum for reminder preference
CREATE TYPE reminder_preference AS ENUM ('off', 'daily_summary', 'due_only');

-- User settings table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'id')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  reminder_pref reminder_preference NOT NULL DEFAULT 'due_only',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Canvases table
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Canvas',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plan trees table
CREATE TABLE plan_trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Main Goal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nodes table
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES plan_trees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),
  index_in_parent INTEGER NOT NULL CHECK (index_in_parent >= 0 AND index_in_parent <= 7),
  title TEXT NOT NULL DEFAULT 'New Task',
  description TEXT,
  status node_status NOT NULL DEFAULT 'in_progress',
  due_date DATE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TIME,
  reminder_timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique ordering within parent
  UNIQUE(tree_id, parent_id, index_in_parent)
);

-- Indexes for efficient queries
CREATE INDEX idx_canvases_user_id ON canvases(user_id);
CREATE INDEX idx_canvases_is_archived ON canvases(is_archived);
CREATE INDEX idx_plan_trees_canvas_id ON plan_trees(canvas_id);
CREATE INDEX idx_plan_trees_user_id ON plan_trees(user_id);
CREATE INDEX idx_nodes_tree_id ON nodes(tree_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_nodes_level ON nodes(level);
CREATE INDEX idx_nodes_user_id ON nodes(user_id);
CREATE INDEX idx_nodes_due_date ON nodes(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_nodes_reminder ON nodes(reminder_enabled, due_date) WHERE reminder_enabled = TRUE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plan_trees_updated_at
  BEFORE UPDATE ON plan_trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
