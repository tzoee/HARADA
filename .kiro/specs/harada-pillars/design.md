# Design Document: Harada Pillars

## Overview

Harada Pillars adalah web application untuk perencanaan bertingkat menggunakan metode Harada. Aplikasi ini dibangun dengan Next.js 14+ App Router, menggunakan Supabase untuk authentication dan database, dengan visualisasi 3D-ish tower menggunakan CSS transforms.

### Key Design Decisions

1. **Lazy Node Generation**: Karena total node per tree bisa mencapai 299,593 nodes (1+8+64+512+4096+32768+262144), nodes di-generate secara lazy sampai Level 3 saat tree dibuat, dan deeper levels di-generate on-demand saat user expand.

2. **Focus Mode Rendering**: Tower View hanya menampilkan focused path + siblings per level (~56 nodes max) untuk performa optimal.

3. **Inherited Blocked Computation**: Status `inherited_blocked` dihitung di client-side saat query, tidak disimpan di database untuk menghindari cascade updates.

4. **CSS 3D Transforms**: Menggunakan CSS perspective dan transforms untuk efek 3D ringan, bukan WebGL, untuk kompatibilitas dan performa.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router (React Server Components + Client Components)│
│  ├── Server Components: Layout, Data Fetching                    │
│  ├── Client Components: Tower View, Interactive UI               │
│  ├── Zustand: UI State (theme, language, panel state)           │
│  └── next-intl: Internationalization                            │
├─────────────────────────────────────────────────────────────────┤
│                      Supabase Client SDK                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase Backend                         │
├─────────────────────────────────────────────────────────────────┤
│  ├── Auth: Email/Password Authentication                        │
│  ├── PostgreSQL: Database with RLS                              │
│  ├── Edge Functions: Reminder Scheduler                         │
│  └── Storage: (Optional) User Avatars                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  └── Email Provider (Abstracted): Reminder Notifications        │
└─────────────────────────────────────────────────────────────────┘
```

### Route Structure

```
/
├── auth/
│   ├── sign-in          # Login page
│   └── sign-up          # Registration page
├── app/                  # Protected routes (requires auth)
│   ├── page.tsx         # Redirect to first canvas or onboarding
│   ├── canvas/
│   │   └── [canvasId]/
│   │       ├── page.tsx           # Canvas Overview (Plan Tree cards)
│   │       └── tree/
│   │           └── [treeId]/
│   │               └── page.tsx   # Tower View
│   └── settings/
│       └── page.tsx     # User preferences
└── api/
    └── cron/
        └── reminders/   # Cron endpoint for reminder scheduler
```

## Components and Interfaces

### Component Hierarchy

```
App
├── RootLayout
│   ├── ThemeProvider
│   ├── IntlProvider
│   └── AuthProvider
│
├── AuthPages
│   ├── SignInForm
│   └── SignUpForm
│
└── AppLayout (protected)
    ├── CanvasSidebar
    │   ├── CanvasDropdown
    │   ├── CanvasList
    │   └── ArchivedSection
    │
    ├── TopBar
    │   ├── Breadcrumb
    │   ├── SearchBar
    │   ├── LanguageToggle
    │   ├── ThemeToggle
    │   └── UserMenu
    │
    └── MainContent
        ├── CanvasOverview
        │   ├── PlanTreeCard[]
        │   └── EmptyState
        │
        ├── TowerView
        │   ├── TowerContainer (3D perspective)
        │   │   └── LevelRing[] (7 levels)
        │   │       └── NodePillarCard[] (8 per level)
        │   ├── ConnectorOverlay (SVG)
        │   └── ZoomPanControls
        │
        └── NodeDetailPanel
            ├── TitleEditor
            ├── DescriptionEditor
            ├── StatusDropdown
            ├── DueDatePicker
            ├── ReminderToggle
            ├── ChildrenGrid
            └── QuickActions
```

### Key Component Interfaces

```typescript
// Canvas Sidebar
interface CanvasSidebarProps {
  canvases: Canvas[];
  activeCanvasId: string | null;
  onCanvasSelect: (id: string) => void;
  onCanvasCreate: () => void;
  onCanvasRename: (id: string, name: string) => void;
  onCanvasArchive: (id: string) => void;
  onCanvasDelete: (id: string) => void;
}

// Tower View
interface TowerViewProps {
  treeId: string;
  focusedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

interface LevelRingProps {
  level: number;
  nodes: NodeWithProgress[];
  focusedNodeId: string | null;
  parentNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

// Node Pillar Card
interface NodePillarCardProps {
  node: NodeWithProgress;
  isSelected: boolean;
  isFocusedPath: boolean;
  isInheritedBlocked: boolean;
  onClick: () => void;
}

// Node Detail Panel
interface NodeDetailPanelProps {
  node: NodeWithProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Node>) => void;
  onStatusChange: (status: NodeStatus) => void;
}

// Connector Overlay
interface ConnectorOverlayProps {
  connections: Connection[];
  focusedPath: string[];
  blockedPaths: string[];
}

interface Connection {
  parentId: string;
  childId: string;
  parentPosition: { x: number; y: number };
  childPosition: { x: number; y: number };
}
```

### Zustand Store Structure

```typescript
// UI Store
interface UIStore {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  
  // Language
  language: 'id' | 'en';
  setLanguage: (lang: 'id' | 'en') => void;
  
  // Panel State
  detailPanelOpen: boolean;
  selectedNodeId: string | null;
  openDetailPanel: (nodeId: string) => void;
  closeDetailPanel: () => void;
  
  // Tower View State
  focusedNodeId: string | null;
  setFocusedNode: (nodeId: string | null) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  rotationAngle: number;
  setRotationAngle: (angle: number) => void;
  
  // Sidebar State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
```

## Data Models

### Database Schema

```sql
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

-- Index for efficient tree traversal
CREATE INDEX idx_nodes_tree_id ON nodes(tree_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_nodes_level ON nodes(level);
CREATE INDEX idx_nodes_due_date ON nodes(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_nodes_reminder ON nodes(reminder_enabled, due_date) WHERE reminder_enabled = TRUE;

-- RLS Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Canvas policies
CREATE POLICY "Users can view own canvases" ON canvases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvases" ON canvases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own canvases" ON canvases
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own canvases" ON canvases
  FOR DELETE USING (auth.uid() = user_id);

-- Plan tree policies
CREATE POLICY "Users can view own trees" ON plan_trees
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trees" ON plan_trees
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trees" ON plan_trees
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trees" ON plan_trees
  FOR DELETE USING (auth.uid() = user_id);

-- Node policies
CREATE POLICY "Users can view own nodes" ON nodes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nodes" ON nodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nodes" ON nodes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nodes" ON nodes
  FOR DELETE USING (auth.uid() = user_id);

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
```

### TypeScript Types

```typescript
// Base types matching database schema
export type NodeStatus = 'done' | 'in_progress' | 'blocked';
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

// Extended types with computed fields
export interface NodeWithProgress extends Node {
  progress: number;
  inherited_blocked: boolean;
  children_count: number;
  children_generated: boolean;
}

export interface PlanTreeWithProgress extends PlanTree {
  progress: number;
  root_node: NodeWithProgress | null;
}

export interface CanvasWithTrees extends Canvas {
  trees: PlanTreeWithProgress[];
}

// Query types for focused path
export interface FocusedPathData {
  path: NodeWithProgress[];  // Nodes from Level 1 to focused node
  siblings_by_level: Map<number, NodeWithProgress[]>;  // 8 siblings per level
}
```

### Zod Validation Schemas

```typescript
import { z } from 'zod';

export const nodeStatusSchema = z.enum(['done', 'in_progress', 'blocked']);
export const reminderPreferenceSchema = z.enum(['off', 'daily_summary', 'due_only']);
export const languageSchema = z.enum(['en', 'id']);
export const themeSchema = z.enum(['dark', 'light']);

export const createCanvasSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const updateCanvasSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_archived: z.boolean().optional(),
});

export const createPlanTreeSchema = z.object({
  canvas_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
});

export const updateNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: nodeStatusSchema.optional(),
  due_date: z.string().nullable().optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_time: z.string().nullable().optional(),
  reminder_timezone: z.string().nullable().optional(),
});

export const updateUserSettingsSchema = z.object({
  language: languageSchema.optional(),
  theme: themeSchema.optional(),
  reminder_pref: reminderPreferenceSchema.optional(),
  timezone: z.string().optional(),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

### Progress and Inherited Blocked Computation

```typescript
/**
 * Computes progress for a node based on its status and children.
 * - Leaf nodes (Level 7): done=1, in_progress=0.5, blocked=0
 * - Non-leaf nodes: average of children's progress
 * - Inherited blocked nodes: always 0
 */
export function computeProgress(
  node: Node,
  children: NodeWithProgress[],
  isInheritedBlocked: boolean
): number {
  if (isInheritedBlocked) {
    return 0;
  }
  
  // Leaf node (Level 7)
  if (node.level === 7 || children.length === 0) {
    switch (node.status) {
      case 'done': return 1;
      case 'in_progress': return 0.5;
      case 'blocked': return 0;
    }
  }
  
  // Non-leaf node: average of children
  const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
  return totalProgress / children.length;
}

/**
 * Determines if a node is inherited blocked.
 * A node is inherited blocked if:
 * - It has an ancestor at Level 2 with status 'blocked'
 * - The blocked status propagates DOWN from Level 2 only
 */
export function isInheritedBlocked(
  node: Node,
  ancestorPath: Node[]
): boolean {
  // Find Level 2 ancestor in path
  const level2Ancestor = ancestorPath.find(n => n.level === 2);
  
  // If there's a Level 2 ancestor and it's blocked, this node is inherited blocked
  if (level2Ancestor && level2Ancestor.status === 'blocked') {
    return true;
  }
  
  return false;
}

/**
 * Builds the focused path data for Tower View rendering.
 * Returns the path from root to focused node, plus siblings at each level.
 */
export async function buildFocusedPathData(
  treeId: string,
  focusedNodeId: string,
  supabase: SupabaseClient
): Promise<FocusedPathData> {
  // 1. Get the focused node
  const { data: focusedNode } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', focusedNodeId)
    .single();
  
  // 2. Build path from root to focused node
  const path: Node[] = [];
  let currentNode = focusedNode;
  
  while (currentNode) {
    path.unshift(currentNode);
    if (currentNode.parent_id) {
      const { data: parent } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', currentNode.parent_id)
        .single();
      currentNode = parent;
    } else {
      currentNode = null;
    }
  }
  
  // 3. Get siblings at each level
  const siblingsByLevel = new Map<number, Node[]>();
  
  for (const node of path) {
    const { data: siblings } = await supabase
      .from('nodes')
      .select('*')
      .eq('tree_id', treeId)
      .eq('parent_id', node.parent_id)
      .order('index_in_parent');
    
    siblingsByLevel.set(node.level, siblings || []);
  }
  
  // 4. Compute progress and inherited_blocked for all nodes
  // ... (implementation details)
  
  return { path, siblings_by_level: siblingsByLevel };
}
```

### Lazy Node Generation Strategy

```typescript
/**
 * Generates child nodes for a parent node.
 * Called when:
 * 1. Creating a new tree (generates up to Level 3)
 * 2. User expands a node at Level 3+ (generates next level)
 */
export async function generateChildNodes(
  parentNode: Node,
  userId: string,
  supabase: SupabaseClient
): Promise<Node[]> {
  // Don't generate children for Level 7 (leaf nodes)
  if (parentNode.level >= 7) {
    return [];
  }
  
  const childLevel = parentNode.level + 1;
  const children: Omit<Node, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  // Generate exactly 8 children
  for (let i = 0; i < 8; i++) {
    children.push({
      tree_id: parentNode.tree_id,
      user_id: userId,
      parent_id: parentNode.id,
      level: childLevel,
      index_in_parent: i,
      title: `Task ${childLevel}.${i + 1}`,
      description: null,
      status: 'in_progress',
      due_date: null,
      reminder_enabled: false,
      reminder_time: null,
      reminder_timezone: null,
    });
  }
  
  const { data, error } = await supabase
    .from('nodes')
    .insert(children)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Creates a new Plan Tree with initial node structure.
 * Generates nodes up to Level 3 by default for performance.
 */
export async function createPlanTree(
  canvasId: string,
  userId: string,
  title: string,
  generateAllLevels: boolean = false,
  supabase: SupabaseClient
): Promise<PlanTree> {
  // 1. Create the tree record
  const { data: tree, error: treeError } = await supabase
    .from('plan_trees')
    .insert({ canvas_id: canvasId, user_id: userId, title })
    .select()
    .single();
  
  if (treeError) throw treeError;
  
  // 2. Create root node (Level 1)
  const { data: rootNode, error: rootError } = await supabase
    .from('nodes')
    .insert({
      tree_id: tree.id,
      user_id: userId,
      parent_id: null,
      level: 1,
      index_in_parent: 0,
      title: title,
      status: 'in_progress',
    })
    .select()
    .single();
  
  if (rootError) throw rootError;
  
  // 3. Generate initial levels (up to Level 3 or all if requested)
  const maxInitialLevel = generateAllLevels ? 7 : 3;
  await generateLevelsRecursively(rootNode, maxInitialLevel, userId, supabase);
  
  return tree;
}

async function generateLevelsRecursively(
  parentNode: Node,
  maxLevel: number,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (parentNode.level >= maxLevel) return;
  
  const children = await generateChildNodes(parentNode, userId, supabase);
  
  // Recursively generate for each child
  for (const child of children) {
    await generateLevelsRecursively(child, maxLevel, userId, supabase);
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Leaf Node Progress Values

*For any* leaf node (Level 7), the progress value SHALL be exactly:
- 1 when status is "done"
- 0.5 when status is "in_progress"  
- 0 when status is "blocked"

**Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3**

### Property 2: Non-Leaf Node Progress Calculation

*For any* non-leaf node with children, the progress value SHALL equal the arithmetic mean of all children's progress values.

**Validates: Requirements 5.4**

### Property 3: Inherited Blocked Progress Override

*For any* node that is under an inherited_blocked path (has a Level 2 ancestor with status "blocked"), the progress value SHALL be 0 regardless of the node's own status or children's progress.

**Validates: Requirements 4.7, 5.5**

### Property 4: Blocking Propagation Rules

*For any* node in the tree:
- If a Level 2 node has status "blocked", ALL its descendants SHALL have inherited_blocked = true
- If a Level 1 node has status "blocked", its children SHALL NOT have inherited_blocked = true
- If a node at Level 3-7 has status "blocked" and is NOT under an inherited_blocked path, its children SHALL NOT automatically have inherited_blocked = true

**Validates: Requirements 4.4, 4.5, 4.6**

### Property 5: Node Structure Invariants

*For any* Plan Tree:
- Every non-leaf node (Levels 1-6) that has been expanded SHALL have exactly 8 children
- No node SHALL have level > 7
- Level 7 nodes SHALL have no children
- Children of any node SHALL be ordered by index_in_parent (0-7) with no gaps or duplicates

**Validates: Requirements 3.5, 3.6, 3.7**

### Property 6: Lazy Generation Correctness

*For any* newly created Plan Tree:
- The root node (Level 1) SHALL exist immediately
- Nodes up to Level 3 SHALL be generated with exactly 8 children per node
- Total initial node count SHALL be 1 + 8 + 64 = 73 nodes

*For any* node expansion at Level 3 or deeper:
- Exactly 8 child nodes SHALL be created
- Each child SHALL have the correct parent_id, level, and index_in_parent

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 7: Canvas Data Isolation (RLS)

*For any* two users A and B:
- User A SHALL NOT be able to read, update, or delete User B's canvases
- User A SHALL NOT be able to read, update, or delete User B's plan_trees
- User A SHALL NOT be able to read, update, or delete User B's nodes

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 8: Canvas Duplication Equivalence

*For any* canvas with trees and nodes, after duplication:
- The duplicated canvas SHALL have the same number of Plan Trees
- Each duplicated Plan Tree SHALL have the same node structure (same levels, same children counts)
- All node titles, descriptions, and statuses SHALL be copied exactly
- The duplicated data SHALL have new UUIDs (not reference original IDs)

**Validates: Requirements 2.3**

### Property 9: Canvas Deletion Cascade

*For any* canvas deletion:
- All Plan Trees belonging to that canvas SHALL be deleted
- All nodes belonging to those Plan Trees SHALL be deleted
- No orphaned records SHALL remain in the database

**Validates: Requirements 2.5**

### Property 10: Focus Mode Node Visibility Bounds

*For any* focused node in Tower View:
- The visible node count SHALL be at most 7 levels × 8 siblings = 56 nodes (plus the focused path)
- The focused path from Level 1 to the focused node SHALL always be visible
- All 8 siblings at each level of the focused path SHALL be visible

**Validates: Requirements 7.1, 7.2**

### Property 11: Breadcrumb Path Accuracy

*For any* focused node, the breadcrumb SHALL display:
- Canvas name as first segment
- Tree title as second segment
- Node titles from Level 1 to current focused node in order

**Validates: Requirements 7.3**

### Property 12: Search Results Accuracy

*For any* search query:
- All returned results SHALL contain the query string in their title (case-insensitive)
- Each result SHALL include the correct canvas name and tree name
- No results from other users' data SHALL be included

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 13: Reminder Scheduling Correctness

*For any* node with reminder_enabled = true and due_date set:
- If due_date is today (H-0) or tomorrow (H-1), a reminder SHALL be queued
- The reminder email SHALL use the user's language preference
- If user's reminder_pref is "off", no reminder SHALL be sent

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 14: Reminder Panel Completeness

*For any* canvas, the Reminder Panel SHALL display all nodes where:
- reminder_enabled = true
- The node belongs to a tree in that canvas

**Validates: Requirements 9.7**

### Property 15: i18n Translation Completeness

*For all* UI string keys in the application:
- Both Indonesian (ID) and English (EN) translations SHALL exist
- No translation SHALL be empty or undefined

**Validates: Requirements 10.2**

### Property 16: Settings Persistence Round-Trip

*For any* user settings change (language, theme, reminder_pref):
- After saving and reloading the application, the setting SHALL retain the saved value

**Validates: Requirements 10.3, 11.3**

### Property 17: Node Duplication Structure Preservation

*For any* node subtree duplication:
- The duplicated subtree SHALL have the same depth as the original
- Each level SHALL have the same number of nodes as the original
- All node data (title, description, status) SHALL be copied

**Validates: Requirements 18.1, 18.2**

### Property 18: Export Data Completeness

*For any* canvas export:
- The exported JSON SHALL contain all canvas metadata
- The exported JSON SHALL contain all Plan Trees with their titles
- The exported JSON SHALL contain all nodes with title, description, status, and due_date
- The exported JSON SHALL be valid JSON that can be parsed

**Validates: Requirements 19.1, 19.2, 19.3**

### Property 19: Authentication Input Validation

*For any* registration attempt with invalid data:
- Empty email SHALL be rejected
- Invalid email format SHALL be rejected
- Password shorter than 8 characters SHALL be rejected
- Appropriate error messages SHALL be displayed

**Validates: Requirements 1.3**

### Property 20: Connector Overlay Completeness

*For any* visible parent-child relationship in Tower View:
- A connector line SHALL exist between the parent and child nodes
- The connector SHALL originate from the parent's position and terminate at the child's position

**Validates: Requirements 6.4**

## Error Handling

### Client-Side Error Handling

```typescript
// Error types
export type AppError = 
  | { type: 'network'; message: string; retryable: true }
  | { type: 'validation'; message: string; field?: string }
  | { type: 'auth'; message: string; redirect?: string }
  | { type: 'not_found'; message: string }
  | { type: 'server'; message: string };

// Error handler hook
export function useErrorHandler() {
  const { language } = useUIStore();
  const t = useTranslations('errors');
  
  const handleError = useCallback((error: AppError) => {
    switch (error.type) {
      case 'network':
        toast.error(t('network_error'), {
          action: {
            label: t('retry'),
            onClick: () => window.location.reload(),
          },
        });
        break;
      case 'validation':
        toast.error(error.message);
        break;
      case 'auth':
        if (error.redirect) {
          router.push(error.redirect);
        }
        toast.error(t('auth_error'));
        break;
      case 'not_found':
        toast.error(t('not_found'));
        break;
      case 'server':
        toast.error(t('server_error'));
        break;
    }
  }, [language, t]);
  
  return { handleError };
}
```

### Server Action Error Handling

```typescript
// Server action wrapper with error handling
export async function safeAction<T>(
  action: () => Promise<T>,
  userId: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await action();
    return { data, error: null };
  } catch (e) {
    if (e instanceof AuthError) {
      return { 
        data: null, 
        error: { type: 'auth', message: 'Unauthorized', redirect: '/auth/sign-in' }
      };
    }
    if (e instanceof PostgrestError) {
      if (e.code === 'PGRST116') {
        return { data: null, error: { type: 'not_found', message: 'Resource not found' } };
      }
      return { data: null, error: { type: 'server', message: e.message } };
    }
    return { data: null, error: { type: 'server', message: 'Unknown error' } };
  }
}
```

### Optimistic Update with Rollback

```typescript
// Example: Optimistic node status update
export function useNodeStatusUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ nodeId, status }: { nodeId: string; status: NodeStatus }) => {
      const { error } = await supabase
        .from('nodes')
        .update({ status })
        .eq('id', nodeId);
      if (error) throw error;
    },
    onMutate: async ({ nodeId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['node', nodeId] });
      
      // Snapshot previous value
      const previousNode = queryClient.getQueryData(['node', nodeId]);
      
      // Optimistically update
      queryClient.setQueryData(['node', nodeId], (old: Node) => ({
        ...old,
        status,
      }));
      
      return { previousNode };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNode) {
        queryClient.setQueryData(['node', variables.nodeId], context.previousNode);
      }
      toast.error('Failed to update status');
    },
    onSettled: (data, error, { nodeId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
    },
  });
}
```

## Testing Strategy

### Dual Testing Approach

This project uses both unit tests and property-based tests for comprehensive coverage:

1. **Unit Tests**: Verify specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Verify universal properties across randomly generated inputs

### Testing Framework

- **Unit Testing**: Vitest
- **Property-Based Testing**: fast-check
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright (optional)

### Property-Based Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});

// tests/setup.ts
import { fc } from 'fast-check';

// Configure fast-check for minimum 100 iterations
fc.configureGlobal({
  numRuns: 100,
  verbose: true,
});
```

### Test File Structure

```
tests/
├── unit/
│   ├── progress.test.ts
│   ├── blocking.test.ts
│   ├── validation.test.ts
│   └── components/
│       ├── NodePillarCard.test.tsx
│       └── TowerView.test.tsx
├── properties/
│   ├── progress.property.test.ts
│   ├── blocking.property.test.ts
│   ├── structure.property.test.ts
│   ├── canvas.property.test.ts
│   └── search.property.test.ts
└── e2e/
    ├── auth.spec.ts
    └── canvas.spec.ts
```

### Example Property Test

```typescript
// tests/properties/progress.property.test.ts
import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';
import { computeProgress } from '@/lib/progress';
import { NodeStatus } from '@/types';

/**
 * Feature: harada-pillars, Property 1: Leaf Node Progress Values
 * Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */
describe('Property 1: Leaf Node Progress Values', () => {
  const leafNodeArb = fc.record({
    id: fc.uuid(),
    level: fc.constant(7),
    status: fc.constantFrom('done', 'in_progress', 'blocked') as fc.Arbitrary<NodeStatus>,
  });

  it('should return correct progress for any leaf node status', () => {
    fc.assert(
      fc.property(leafNodeArb, (node) => {
        const progress = computeProgress(node, [], false);
        
        switch (node.status) {
          case 'done':
            expect(progress).toBe(1);
            break;
          case 'in_progress':
            expect(progress).toBe(0.5);
            break;
          case 'blocked':
            expect(progress).toBe(0);
            break;
        }
      })
    );
  });
});

/**
 * Feature: harada-pillars, Property 2: Non-Leaf Node Progress Calculation
 * Validates: Requirements 5.4
 */
describe('Property 2: Non-Leaf Node Progress Calculation', () => {
  const childProgressArb = fc.array(fc.float({ min: 0, max: 1 }), { minLength: 1, maxLength: 8 });

  it('should calculate progress as average of children for any non-leaf node', () => {
    fc.assert(
      fc.property(childProgressArb, (childProgresses) => {
        const children = childProgresses.map((progress, i) => ({
          id: `child-${i}`,
          progress,
          inherited_blocked: false,
        }));
        
        const parentNode = { id: 'parent', level: 3, status: 'in_progress' as NodeStatus };
        const expectedProgress = childProgresses.reduce((a, b) => a + b, 0) / childProgresses.length;
        
        const actualProgress = computeProgress(parentNode, children, false);
        
        expect(actualProgress).toBeCloseTo(expectedProgress, 10);
      })
    );
  });
});

/**
 * Feature: harada-pillars, Property 3: Inherited Blocked Progress Override
 * Validates: Requirements 4.7, 5.5
 */
describe('Property 3: Inherited Blocked Progress Override', () => {
  const nodeWithChildrenArb = fc.record({
    id: fc.uuid(),
    level: fc.integer({ min: 3, max: 7 }),
    status: fc.constantFrom('done', 'in_progress', 'blocked') as fc.Arbitrary<NodeStatus>,
  });

  it('should return 0 progress for any inherited blocked node regardless of status', () => {
    fc.assert(
      fc.property(nodeWithChildrenArb, (node) => {
        const children = Array(8).fill(null).map((_, i) => ({
          id: `child-${i}`,
          progress: 1, // All children "done"
          inherited_blocked: true,
        }));
        
        const progress = computeProgress(node, children, true);
        
        expect(progress).toBe(0);
      })
    );
  });
});
```

### Example Unit Test

```typescript
// tests/unit/blocking.test.ts
import { describe, it, expect } from 'vitest';
import { isInheritedBlocked } from '@/lib/blocking';
import { Node } from '@/types';

describe('isInheritedBlocked', () => {
  it('should return true when Level 2 ancestor is blocked', () => {
    const level2Node: Node = { id: 'l2', level: 2, status: 'blocked' } as Node;
    const level3Node: Node = { id: 'l3', level: 3, status: 'in_progress' } as Node;
    
    const result = isInheritedBlocked(level3Node, [level2Node]);
    
    expect(result).toBe(true);
  });

  it('should return false when Level 1 is blocked (no propagation)', () => {
    const level1Node: Node = { id: 'l1', level: 1, status: 'blocked' } as Node;
    const level2Node: Node = { id: 'l2', level: 2, status: 'in_progress' } as Node;
    
    const result = isInheritedBlocked(level2Node, [level1Node]);
    
    expect(result).toBe(false);
  });

  it('should return false when no Level 2 ancestor is blocked', () => {
    const level2Node: Node = { id: 'l2', level: 2, status: 'in_progress' } as Node;
    const level5Node: Node = { id: 'l5', level: 5, status: 'in_progress' } as Node;
    
    const result = isInheritedBlocked(level5Node, [level2Node]);
    
    expect(result).toBe(false);
  });
});
```

### Test Coverage Goals

| Area | Unit Tests | Property Tests |
|------|------------|----------------|
| Progress Calculation | Edge cases | Properties 1, 2, 3 |
| Blocking Logic | Specific scenarios | Property 4 |
| Node Structure | Validation | Properties 5, 6 |
| Canvas Operations | CRUD operations | Properties 8, 9 |
| Search | Query matching | Property 12 |
| Reminders | Scheduling logic | Properties 13, 14 |
| i18n | Translation loading | Property 15 |
| Settings | Persistence | Property 16 |
| Export | JSON generation | Property 18 |
| Auth | Validation | Property 19 |
