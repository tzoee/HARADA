-- Checklist items table for Level 3 nodes
-- Each Level 3 node can have unlimited checklist items

CREATE TYPE checklist_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Item',
  status checklist_status NOT NULL DEFAULT 'todo',
  notes TEXT,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_checklist_items_node_id ON checklist_items(node_id);
CREATE INDEX idx_checklist_items_user_id ON checklist_items(user_id);
CREATE INDEX idx_checklist_items_sort_order ON checklist_items(node_id, sort_order);

-- Updated_at trigger
CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies for checklist_items
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist items"
  ON checklist_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own checklist items"
  ON checklist_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own checklist items"
  ON checklist_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own checklist items"
  ON checklist_items FOR DELETE
  USING (user_id = auth.uid());
