# Implementation Plan: Harada Pillars

## Overview

Implementasi Harada Pillars web application menggunakan Next.js 14+ App Router, Supabase, TailwindCSS, shadcn/ui, dan Zustand. Pendekatan incremental: setup → auth → data layer → core features → UI components → advanced features.

## Tasks

- [x] 1. Project Setup and Configuration
  - [x] 1.1 Initialize Next.js 14+ project with TypeScript and App Router
    - Run `npx create-next-app@latest harada-pillars --typescript --tailwind --eslint --app --src-dir`
    - Configure tsconfig.json with strict mode and path aliases
    - _Requirements: Stack specification_

  - [x] 1.2 Install and configure dependencies
    - Install: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `next-intl`, `zod`, `framer-motion`
    - Install shadcn/ui: `npx shadcn-ui@latest init`
    - Add shadcn components: button, input, dropdown-menu, dialog, toast, tabs, badge, progress, calendar
    - _Requirements: Stack specification_

  - [x] 1.3 Setup Supabase client configuration
    - Create `src/lib/supabase/client.ts` for browser client
    - Create `src/lib/supabase/server.ts` for server components
    - Create `src/lib/supabase/middleware.ts` for auth middleware
    - Setup environment variables (.env.local)
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 1.4 Configure next-intl for bilingual support
    - Create `src/i18n.ts` configuration
    - Create `messages/en.json` and `messages/id.json` translation files
    - Setup middleware for locale detection
    - _Requirements: 10.1, 10.2_

  - [x] 1.5 Setup Zustand store for UI state
    - Create `src/store/ui-store.ts` with theme, language, panel state
    - Implement persistence to localStorage
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Database Schema and Migrations
  - [x] 2.1 Create Supabase SQL migration for core tables
    - Create `supabase/migrations/001_initial_schema.sql`
    - Define user_settings, canvases, plan_trees, nodes tables
    - Add indexes for performance
    - _Requirements: Database schema specification_

  - [x] 2.2 Implement Row Level Security policies
    - Add RLS policies for all tables (user_id = auth.uid())
    - Test policies prevent cross-user access
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 2.3 Write property test for RLS data isolation
    - **Property 7: Canvas Data Isolation (RLS)**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
    - **Test file: tests/properties/canvas.property.test.ts**

- [x] 3. TypeScript Types and Validation Schemas
  - [x] 3.1 Create TypeScript type definitions
    - Create `src/types/database.ts` with all entity types
    - Create `src/types/computed.ts` for NodeWithProgress, etc.
    - _Requirements: Data Models specification_

  - [x] 3.2 Create Zod validation schemas
    - Create `src/lib/validations/canvas.ts`
    - Create `src/lib/validations/node.ts`
    - Create `src/lib/validations/auth.ts`
    - _Requirements: 12.5, 12.6_

  - [x] 3.3 Write property test for validation schemas
    - **Property 19: Authentication Input Validation**
    - **Validates: Requirements 1.3**
    - **Test file: tests/properties/validation.property.test.ts**

- [x] 4. Authentication System
  - [x] 4.1 Create auth middleware for route protection
    - Create `src/middleware.ts` with Supabase auth check
    - Redirect unauthenticated users to /auth/sign-in
    - _Requirements: 1.7_

  - [x] 4.2 Implement sign-up page and form
    - Create `src/app/auth/sign-up/page.tsx`
    - Create SignUpForm component with email/password fields
    - Implement server action for registration
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.3 Implement sign-in page and form
    - Create `src/app/auth/sign-in/page.tsx`
    - Create SignInForm component with email/password fields
    - Implement server action for login
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 4.4 Create user settings initialization
    - Auto-create user_settings row on first sign-in
    - Set default language, theme, reminder preferences
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 5. Checkpoint - Auth System Complete
  - Auth flow implemented with sign-up, sign-in, and middleware protection
  - RLS policies active for all tables
  - Property tests: validation.property.test.ts

- [x] 6. Core Business Logic
  - [x] 6.1 Implement progress calculation functions
    - Create `src/lib/progress.ts` with computeProgress function
    - Handle leaf nodes (Level 7) and non-leaf nodes
    - Handle inherited_blocked override
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write property tests for progress calculation
    - **Property 1: Leaf Node Progress Values**
    - **Property 2: Non-Leaf Node Progress Calculation**
    - **Property 3: Inherited Blocked Progress Override**
    - **Validates: Requirements 4.1-4.3, 5.1-5.5**
    - **Test file: tests/properties/progress.property.test.ts**

  - [x] 6.3 Implement blocking logic functions
    - Create `src/lib/blocking.ts` with isInheritedBlocked function
    - Implement Level 2 blocking propagation rules
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [x] 6.4 Write property test for blocking propagation
    - **Property 4: Blocking Propagation Rules**
    - **Validates: Requirements 4.4, 4.5, 4.6**
    - **Test file: tests/properties/blocking.property.test.ts**

  - [x] 6.5 Implement lazy node generation
    - Create `src/lib/tree-generation.ts`
    - Implement generateChildNodes for 8 children per node
    - Implement createPlanTree with initial Level 1-3 generation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.6 Write property tests for node structure
    - **Property 5: Node Structure Invariants**
    - **Property 6: Lazy Generation Correctness**
    - **Validates: Requirements 3.1-3.7**
    - **Test file: tests/properties/structure.property.test.ts**

- [x] 7. Canvas Server Actions
  - [x] 7.1 Implement canvas CRUD server actions
    - Create `src/app/actions/canvas.ts`
    - Implement createCanvas, updateCanvas, deleteCanvas, archiveCanvas
    - Add ownership verification
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 7.2 Implement canvas duplication
    - Create duplicateCanvas action with deep copy of trees and nodes
    - Generate new UUIDs for all copied entities
    - _Requirements: 2.3_

  - [x] 7.3 Write property tests for canvas operations
    - **Property 8: Canvas Duplication Equivalence**
    - **Property 9: Canvas Deletion Cascade**
    - **Validates: Requirements 2.3, 2.5**
    - **Test file: tests/properties/canvas.property.test.ts**

- [x] 8. Plan Tree and Node Server Actions
  - [x] 8.1 Implement plan tree server actions
    - Create `src/app/actions/tree.ts`
    - Implement createPlanTree with lazy generation
    - Implement deletePlanTree with cascade
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Implement node server actions
    - Create `src/app/actions/node.ts`
    - Implement updateNode for title, description, status, due_date
    - Implement expandNode for lazy child generation
    - _Requirements: 3.3, 8.1-8.8_

  - [x] 8.3 Implement focused path query
    - Create `src/lib/queries/focused-path.ts`
    - Build path from root to focused node
    - Fetch siblings at each level
    - Compute progress and inherited_blocked for all nodes
    - _Requirements: 7.1, 7.2_

- [x] 9. Checkpoint - Data Layer Complete
  - Server actions implemented for canvas, tree, and node operations
  - Progress and blocking calculations verified
  - Property tests: progress.property.test.ts, blocking.property.test.ts, structure.property.test.ts

- [x] 10. Layout and Navigation Components
  - [x] 10.1 Create app layout with sidebar
    - Create `src/app/app/layout.tsx` with sidebar + main content areas
    - Implement responsive design (collapsible sidebar on mobile)
    - _Requirements: UI Layout specification_

  - [x] 10.2 Implement CanvasSidebar component
    - Create `src/components/canvas-sidebar.tsx`
    - Display canvas list with dropdown switcher
    - Add "New Canvas" button
    - Show archived section
    - _Requirements: 2.6, 2.7_

  - [x] 10.3 Implement TopBar component
    - Create `src/components/top-bar.tsx`
    - Add Breadcrumb, SearchBar, LanguageToggle, ThemeToggle, UserMenu
    - _Requirements: 7.3, 10.1, 11.2, 14.1_

  - [x] 10.4 Implement LanguageToggle and ThemeToggle
    - Create `src/components/language-toggle.tsx`
    - Create `src/components/theme-toggle.tsx`
    - Connect to Zustand store
    - _Requirements: 10.1, 11.2_

- [x] 11. Canvas Overview Page
  - [x] 11.1 Create canvas overview page
    - Create `src/app/app/canvas/[canvasId]/page.tsx`
    - Fetch canvas with plan trees
    - Display PlanTreeCard grid
    - _Requirements: 13.1, 13.2_

  - [x] 11.2 Implement PlanTreeCard component
    - Create `src/components/plan-tree-card.tsx`
    - Display tree title and progress ring
    - Navigate to Tower View on click
    - _Requirements: 13.2, 13.3_

  - [x] 11.3 Implement empty state
    - Create `src/components/empty-state.tsx`
    - Display "Create your first Main Goal" prompt
    - _Requirements: 13.4_

- [x] 12. Tower View Core
  - [x] 12.1 Create Tower View page
    - Create `src/app/app/canvas/[canvasId]/tree/[treeId]/page.tsx`
    - Fetch focused path data
    - Setup 3D perspective container
    - _Requirements: 6.1, 6.2_

  - [x] 12.2 Implement TowerContainer with 3D transforms
    - Create `src/components/tower/tower-container.tsx`
    - Apply CSS perspective and transform-style: preserve-3d
    - Implement zoom and rotation state
    - _Requirements: 6.2, 6.8, 6.9_

  - [x] 12.3 Implement LevelRing component
    - Create `src/components/tower/level-ring.tsx`
    - Arrange 8 nodes in octagonal pattern using CSS transforms
    - Scale rings smaller for deeper levels
    - _Requirements: 6.1, 6.3_

  - [x] 12.4 Implement NodePillarCard component
    - Create `src/components/tower/node-pillar-card.tsx`
    - Display title, status badge, progress ring
    - Apply glassy dark UI styling
    - Implement hover glow effect
    - _Requirements: 6.6, 4.1, 4.2, 4.3_

  - [x] 12.5 Implement ConnectorOverlay
    - Create `src/components/tower/connector-overlay.tsx`
    - Draw SVG lines between parent and child nodes
    - Apply muted/striped style for blocked paths
    - _Requirements: 6.4, 6.5_

  - [x] 12.6 Write property test for connector completeness
    - **Property 20: Connector Overlay Completeness**
    - **Validates: Requirements 6.4**
    - **Test file: tests/properties/connector.property.test.ts**

- [x] 13. Focus Mode and Navigation
  - [x] 13.1 Implement Focus Mode state management
    - Add focusedNodeId to Zustand store
    - Implement setFocusedNode action
    - _Requirements: 7.1_

  - [x] 13.2 Implement focus path rendering
    - Update TowerView to render only focused path + siblings
    - Highlight focused path nodes
    - _Requirements: 7.2_

  - [x] 13.3 Write property test for focus mode bounds
    - **Property 10: Focus Mode Node Visibility Bounds**
    - **Validates: Requirements 7.1, 7.2**
    - **Test file: tests/properties/focus-mode.property.test.ts**

  - [x] 13.4 Implement Breadcrumb component
    - Create `src/components/breadcrumb.tsx`
    - Display Canvas > Tree > Node path
    - Make each segment clickable
    - _Requirements: 7.3_

  - [x] 13.5 Write property test for breadcrumb accuracy
    - **Property 11: Breadcrumb Path Accuracy**
    - **Validates: Requirements 7.3**
    - **Test file: tests/properties/focus-mode.property.test.ts**

- [x] 14. Node Detail Panel
  - [x] 14.1 Implement NodeDetailPanel component
    - Create `src/components/node-detail-panel.tsx`
    - Add slide-in animation from right
    - _Requirements: 8.1-8.8_

  - [x] 14.2 Implement editable fields
    - Add TitleEditor with inline editing
    - Add DescriptionEditor with basic markdown
    - Add StatusDropdown
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 14.3 Implement due date and reminder controls
    - Add DueDatePicker using shadcn Calendar
    - Add ReminderToggle with time picker
    - _Requirements: 8.4, 8.5_

  - [x] 14.4 Implement ChildrenGrid
    - Display 8 child nodes in grid
    - Allow navigation to child nodes
    - _Requirements: 8.6_

  - [x] 14.5 Implement quick actions
    - Add "Mark done" button
    - Add "Set blocked" button
    - _Requirements: 8.7, 8.8_

- [x] 15. Checkpoint - Core UI Complete
  - Tower View renders with 3D transforms and level rings
  - Focus Mode navigation implemented with breadcrumb
  - Node Detail Panel with editable fields and quick actions
  - Property tests: focus-mode.property.test.ts, connector.property.test.ts

- [x] 16. Mobile Responsive View
  - [x] 16.1 Implement Stacked Pillars View
    - Create `src/components/tower/stacked-pillars-view.tsx`
    - Display levels as vertical list
    - Add mini connectors between levels
    - _Requirements: 6.10_

  - [x] 16.2 Add responsive breakpoint detection
    - Use media query hook to detect mobile
    - Switch between TowerView and StackedPillarsView
    - _Requirements: 6.10_

- [x] 17. Search Functionality
  - [x] 17.1 Implement search server action
    - Create `src/app/actions/search.ts`
    - Search nodes by title across user's canvases
    - Return node with canvas and tree context
    - _Requirements: 14.1, 14.2_

  - [x] 17.2 Implement SearchBar component
    - Create `src/components/search-bar.tsx`
    - Add debounced search input
    - Display results dropdown
    - Navigate to node on click
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 17.3 Write property test for search accuracy
    - **Property 12: Search Results Accuracy**
    - **Validates: Requirements 14.1, 14.2, 14.3**
    - **Test file: tests/properties/search.property.test.ts**

- [x] 18. Settings Page

- [x] 19. Reminder System

- [x] 20. i18n Translation Files
  - [x] 20.1 Complete English translations
    - Add all UI strings to `messages/en.json`
    - Include error messages, labels, buttons
    - _Requirements: 10.2_

  - [x] 20.2 Complete Indonesian translations
    - Add all UI strings to `messages/id.json`
    - Ensure parity with English
    - _Requirements: 10.2_

  - [x] 20.3 Write property test for translation completeness
    - **Property 15: i18n Translation Completeness**
    - **Validates: Requirements 10.2**
    - **Test file: tests/properties/i18n.property.test.ts**

- [x] 21. Error Handling and Optimistic Updates
  - [x] 21.1 Implement error handler hook
    - Create `src/hooks/use-error-handler.ts`
    - Handle network, validation, auth, server errors
    - Display bilingual error messages
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 21.2 Implement optimistic updates with rollback
    - Add optimistic update to node status changes
    - Implement rollback on error
    - _Requirements: 16.4_
    - **File: src/hooks/use-optimistic-update.ts**

- [x] 22. Node Duplication Feature
  - [x] 22.1 Implement subtree duplication
    - Create duplicateSubtree server action
    - Copy node and all descendants with new UUIDs
    - _Requirements: 18.1, 18.2_

  - [x] 22.2 Add duplication UI
    - Add "Duplicate subtree" button to NodeDetailPanel
    - Show success feedback
    - _Requirements: 18.3_

  - [x] 22.3 Write property test for duplication
    - **Property 17: Node Duplication Structure Preservation**
    - **Validates: Requirements 18.1, 18.2**
    - **Test file: tests/properties/duplication.property.test.ts**

- [x] 23. Export Feature
  - [x] 23.1 Implement canvas export
    - Create exportCanvas server action
    - Generate JSON with canvas, trees, and all nodes
    - _Requirements: 19.1, 19.2_

  - [x] 23.2 Add export UI
    - Add "Export Canvas" button to canvas menu
    - Trigger file download
    - _Requirements: 19.3_

  - [x] 23.3 Write property test for export completeness
    - **Property 18: Export Data Completeness**
    - **Validates: Requirements 19.1, 19.2, 19.3**
    - **Test file: tests/properties/export.property.test.ts**

- [x] 24. Accessibility Improvements
  - [x] 24.1 Add keyboard navigation
    - Implement Tab navigation through interactive elements
    - Add Escape to close panels
    - Add arrow key navigation in Tower View
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 24.2 Add ARIA labels
    - Add aria-label to all interactive elements
    - Add aria-live regions for dynamic content
    - _Requirements: 17.4_

  - [x] 24.3 Verify color contrast
    - Ensure WCAG AA compliance for both themes
    - Created `src/lib/accessibility/color-contrast.ts` with verification utilities
    - Created `tests/properties/accessibility.property.test.ts` with property tests
    - _Requirements: 17.5_

- [x] 25. Final Checkpoint - All Features Complete
  - All 14 property test files created covering all correctness properties
  - All requirements implemented (1-19)
  - Accessibility improvements complete (keyboard nav, ARIA labels, color contrast)

## Notes

- All tasks including property-based tests are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Lazy generation strategy: Level 1-3 on tree creation, deeper levels on-demand
- Focus Mode limits visible nodes to ~56 for performance
