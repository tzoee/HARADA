// Database types matching Supabase schema

export type NodeStatus = 'done' | 'in_progress' | 'blocked';
export type ChecklistStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type ReminderPreference = 'off' | 'daily_summary' | 'due_only';
export type Language = 'en' | 'id';
export type Theme = 'dark' | 'light';

export interface UserSettings {
  id: string;
  user_id: string;
  language: Language;
  theme: Theme;
  reminder_pref: ReminderPreference;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Canvas {
  id: string;
  user_id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanTree {
  id: string;
  canvas_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Node {
  id: string;
  tree_id: string;
  user_id: string;
  parent_id: string | null;
  level: number;
  index_in_parent: number;
  title: string;
  description: string | null;
  status: NodeStatus;
  due_date: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  reminder_timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  node_id: string;
  user_id: string;
  title: string;
  status: ChecklistStatus;
  notes: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Supabase Database type for type-safe queries
export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      canvases: {
        Row: Canvas;
        Insert: Omit<Canvas, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Canvas, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
      };
      plan_trees: {
        Row: PlanTree;
        Insert: Omit<PlanTree, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PlanTree, 'id' | 'user_id' | 'canvas_id' | 'created_at' | 'updated_at'>>;
      };
      nodes: {
        Row: Node;
        Insert: Omit<Node, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Node, 'id' | 'user_id' | 'tree_id' | 'created_at' | 'updated_at'>>;
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChecklistItem, 'id' | 'user_id' | 'node_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Enums: {
      node_status: NodeStatus;
      checklist_status: ChecklistStatus;
      reminder_preference: ReminderPreference;
    };
  };
}
