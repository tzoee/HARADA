# Requirements Document

## Introduction

Harada Pillars adalah web application untuk perencanaan bertingkat menggunakan metode Harada. Aplikasi ini memvisualisasikan hierarki goal sebagai pilar 3D-ish yang saling terhubung, dengan setiap level memiliki tepat 8 anak node sampai kedalaman maksimum 7 level. Aplikasi mendukung multi-canvas, bilingual (ID/EN), dark/light mode, dan sistem reminder via email.

## Glossary

- **Canvas**: Workspace/board untuk sebuah rencana besar yang berisi beberapa Plan Trees
- **Plan_Tree**: Struktur hierarki dengan 1 Main Goal (Level 1) sebagai root
- **Node**: Unit terkecil dalam Plan Tree, memiliki title, status, dan metadata
- **Level**: Kedalaman node dalam hierarki (1-7), Level 1 adalah root
- **Inherited_Blocked**: Status blocked yang diwariskan dari parent Level 2 ke semua descendants
- **Tower_View**: Visualisasi 3D-ish dari Plan Tree sebagai menara bertingkat
- **Focus_Mode**: Mode tampilan yang hanya menampilkan jalur terfokus + siblings per level
- **Reminder_System**: Sistem notifikasi email untuk node dengan due date

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to sign up and sign in with email and password, so that I can securely access my personal planning data.

#### Acceptance Criteria

1. WHEN a user visits /auth/sign-up, THE Auth_System SHALL display a registration form with email and password fields
2. WHEN a user submits valid registration credentials, THE Auth_System SHALL create a new account and redirect to /app
3. WHEN a user submits invalid registration data, THE Auth_System SHALL display appropriate error messages
4. WHEN a user visits /auth/sign-in, THE Auth_System SHALL display a login form with email and password fields
5. WHEN a user submits valid login credentials, THE Auth_System SHALL authenticate and redirect to /app
6. WHEN a user submits invalid login credentials, THE Auth_System SHALL display an error message without revealing which field is incorrect
7. WHEN an unauthenticated user tries to access /app routes, THE Auth_System SHALL redirect to /auth/sign-in

### Requirement 2: Canvas Management

**User Story:** As a user, I want to create and manage multiple canvases, so that I can organize different planning projects separately.

#### Acceptance Criteria

1. WHEN a user clicks "New Canvas", THE Canvas_System SHALL create a new canvas with a default name and display it in the sidebar
2. WHEN a user renames a canvas, THE Canvas_System SHALL update the canvas name and reflect it immediately in the UI
3. WHEN a user duplicates a canvas, THE Canvas_System SHALL create a complete copy including all Plan Trees and nodes
4. WHEN a user archives a canvas, THE Canvas_System SHALL move it to the "Archived" section and hide it from the main list
5. WHEN a user deletes a canvas, THE Canvas_System SHALL remove the canvas and all associated Plan Trees and nodes permanently
6. WHEN a user selects a canvas from the sidebar, THE Canvas_System SHALL display the Canvas Overview with all Plan Trees as cards
7. THE Canvas_Sidebar SHALL display a dropdown for canvas switching and a list of all non-archived canvases

### Requirement 3: Plan Tree Creation and Structure

**User Story:** As a user, I want to create Plan Trees with a fixed 8-child structure per level, so that I can follow the Harada method systematically.

#### Acceptance Criteria

1. WHEN a user clicks "New Main Goal" in a canvas, THE Tree_System SHALL create a new Plan Tree with Level 1 root node
2. WHEN a Plan Tree is created, THE Tree_System SHALL lazy-generate nodes up to Level 3 initially with exactly 8 children per node
3. WHEN a user expands a node at Level 3 or deeper, THE Tree_System SHALL generate 8 child nodes for that node on demand
4. WHEN a user selects "Generate all now" option, THE Tree_System SHALL generate all nodes up to Level 7 for the entire tree
5. THE Node_Structure SHALL enforce exactly 8 children per non-leaf node (Levels 1-6)
6. THE Node_Structure SHALL enforce maximum depth of Level 7 (leaf nodes have no children)
7. WHEN displaying node children, THE Tree_System SHALL maintain consistent ordering via index_in_parent (0-7)

### Requirement 4: Node Status Management

**User Story:** As a user, I want to set and track status for each node, so that I can monitor progress across my planning hierarchy.

#### Acceptance Criteria

1. WHEN a user sets a node status to "done", THE Node_System SHALL display a check icon badge and set progress to 1
2. WHEN a user sets a node status to "in_progress", THE Node_System SHALL display a progress icon badge and set progress to 0.5
3. WHEN a user sets a node status to "blocked", THE Node_System SHALL display a stop icon badge and set progress to 0
4. WHEN a Level 2 node is set to "blocked", THE Blocking_System SHALL mark all descendants as "inherited_blocked"
5. WHEN a Level 1 node is set to "blocked", THE Blocking_System SHALL NOT propagate blocked status to children
6. WHEN a node at Level 3-7 is set to "blocked", THE Blocking_System SHALL NOT automatically propagate to children unless already under inherited_blocked path
7. WHEN a node is under inherited_blocked path, THE Node_System SHALL display "Blocked by Level 2" label and show progress as 0

### Requirement 5: Progress Calculation

**User Story:** As a user, I want to see accurate progress for each node based on its children, so that I can understand completion status at any level.

#### Acceptance Criteria

1. WHEN a leaf node (Level 7) has status "done", THE Progress_System SHALL return progress value 1
2. WHEN a leaf node (Level 7) has status "in_progress", THE Progress_System SHALL return progress value 0.5
3. WHEN a leaf node (Level 7) has status "blocked", THE Progress_System SHALL return progress value 0
4. WHEN a non-leaf node has children, THE Progress_System SHALL calculate progress as average of all children's progress
5. WHEN a node is under inherited_blocked path, THE Progress_System SHALL return progress value 0 regardless of children status
6. WHEN displaying progress, THE Node_Card SHALL show a progress ring with percentage

### Requirement 6: Tower View Visualization

**User Story:** As a user, I want to see my Plan Tree as a 3D-ish tower, so that I can visualize the hierarchy in an engaging way.

#### Acceptance Criteria

1. WHEN a user opens a Plan Tree, THE Tower_View SHALL display levels as stacked rings with Level 1 largest at top and Level 7 smallest at bottom
2. THE Tower_View SHALL use CSS 3D transforms with perspective to create depth effect
3. WHEN displaying a level, THE Tower_View SHALL arrange 8 nodes in octagonal/circular pattern
4. THE Connector_Overlay SHALL draw SVG lines connecting parent nodes to child nodes across levels
5. WHEN a path is inherited_blocked, THE Connector_Overlay SHALL display muted/striped connector lines
6. WHEN a user hovers over a node, THE Node_Card SHALL display a subtle glow effect
7. WHEN a user clicks a node, THE Tower_View SHALL open the Node Detail Panel
8. WHEN a user drags horizontally, THE Tower_View SHALL rotate the view slightly (limited rotation)
9. WHEN a user scrolls, THE Tower_View SHALL zoom in/out within comfortable bounds
10. WHEN screen width is below mobile breakpoint, THE Tower_View SHALL switch to Stacked Pillars View (vertical list)

### Requirement 7: Focus Mode Navigation

**User Story:** As a user, I want to focus on a specific branch path, so that I can work on detailed tasks without visual overload.

#### Acceptance Criteria

1. WHEN a user clicks a node, THE Focus_Mode SHALL display the path from Level 1 to Level 7 for that branch
2. WHEN in Focus Mode, THE Tower_View SHALL display only the focused path plus sibling nodes at each level (max ~56 nodes visible)
3. WHEN navigating Focus Mode, THE Breadcrumb SHALL update to show current path (Canvas > Tree > Node hierarchy)
4. WHEN a user clicks a sibling node, THE Focus_Mode SHALL shift focus to that node's branch

### Requirement 8: Node Detail Panel

**User Story:** As a user, I want to view and edit node details in a side panel, so that I can manage individual tasks efficiently.

#### Acceptance Criteria

1. WHEN a node is selected, THE Detail_Panel SHALL display editable title field
2. WHEN a node is selected, THE Detail_Panel SHALL display editable description field with basic markdown support
3. WHEN a node is selected, THE Detail_Panel SHALL display status dropdown (done/in_progress/blocked)
4. WHEN a node is selected, THE Detail_Panel SHALL display due date picker
5. WHEN a node is selected, THE Detail_Panel SHALL display reminder toggle with time picker
6. WHEN a non-leaf node is selected, THE Detail_Panel SHALL display children grid showing 8 child nodes
7. WHEN a user clicks "Mark done", THE Detail_Panel SHALL update node status to done
8. WHEN a user clicks "Set blocked", THE Detail_Panel SHALL update node status to blocked

### Requirement 9: Reminder System

**User Story:** As a user, I want to receive email reminders for nodes with due dates, so that I don't miss important deadlines.

#### Acceptance Criteria

1. WHEN a user enables reminder for a node, THE Reminder_System SHALL store reminder_enabled, reminder_time, and reminder_timezone
2. WHEN a node's due date is approaching (H-1 or H-0), THE Reminder_Scheduler SHALL queue an email notification
3. WHEN sending reminder email, THE Email_Provider SHALL use the user's preferred language (ID/EN)
4. WHEN a user sets reminder preference to "off", THE Reminder_System SHALL not send any reminders
5. WHEN a user sets reminder preference to "daily summary", THE Reminder_System SHALL send one daily email with all upcoming due dates
6. WHEN a user sets reminder preference to "due-only", THE Reminder_System SHALL send individual emails only for due items
7. THE Reminder_Panel SHALL display all nodes with reminders enabled for the current canvas

### Requirement 10: Bilingual Support

**User Story:** As a user, I want to switch between Indonesian and English, so that I can use the app in my preferred language.

#### Acceptance Criteria

1. WHEN a user clicks the language toggle, THE i18n_System SHALL switch all UI labels to the selected language
2. THE i18n_System SHALL support Indonesian (ID) and English (EN) languages
3. WHEN a user changes language preference, THE i18n_System SHALL persist the preference
4. WHEN sending reminder emails, THE Email_System SHALL use the user's language preference

### Requirement 11: Theme Support

**User Story:** As a user, I want to toggle between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the app loads, THE Theme_System SHALL default to dark mode
2. WHEN a user clicks the theme toggle, THE Theme_System SHALL switch between dark and light mode
3. WHEN a user changes theme preference, THE Theme_System SHALL persist the preference
4. THE UI_Components SHALL support both dark and light color schemes with clean, modern aesthetics

### Requirement 12: Data Security and Privacy

**User Story:** As a user, I want my planning data to be private and secure, so that only I can access my canvases and nodes.

#### Acceptance Criteria

1. THE Database_RLS SHALL enforce that users can only read their own canvases (user_id = auth.uid())
2. THE Database_RLS SHALL enforce that users can only read their own plan_trees (user_id = auth.uid())
3. THE Database_RLS SHALL enforce that users can only read their own nodes (user_id = auth.uid())
4. THE Database_RLS SHALL enforce that users can only create/update/delete their own data
5. WHEN a server action is called, THE API_Layer SHALL verify ownership via user_id before any mutation
6. THE Validation_Layer SHALL use Zod schemas for all client and server-side validation

### Requirement 13: Canvas Overview

**User Story:** As a user, I want to see all Plan Trees in a canvas as cards, so that I can get an overview of my planning projects.

#### Acceptance Criteria

1. WHEN a user opens a canvas, THE Canvas_Overview SHALL display all Plan Trees as cards
2. WHEN displaying a Plan Tree card, THE Card SHALL show main goal title and overall progress
3. WHEN a user clicks a Plan Tree card, THE Router SHALL navigate to the Tower View for that tree
4. WHEN a canvas has no Plan Trees, THE Canvas_Overview SHALL display an empty state with "Create your first Main Goal" prompt

### Requirement 14: Search Functionality

**User Story:** As a user, I want to search for nodes across my canvases, so that I can quickly find specific tasks.

#### Acceptance Criteria

1. WHEN a user types in the search bar, THE Search_System SHALL filter nodes by title matching the query
2. WHEN search results are displayed, THE Search_Results SHALL show node title, canvas name, and tree name
3. WHEN a user clicks a search result, THE Router SHALL navigate to that node in Tower View with Focus Mode

### Requirement 15: User Settings

**User Story:** As a user, I want to manage my preferences in a settings page, so that I can customize my experience.

#### Acceptance Criteria

1. WHEN a user visits /app/settings, THE Settings_Page SHALL display language preference selector
2. WHEN a user visits /app/settings, THE Settings_Page SHALL display theme preference selector
3. WHEN a user visits /app/settings, THE Settings_Page SHALL display reminder preference selector (off/daily summary/due-only)
4. WHEN a user saves settings, THE Settings_System SHALL persist preferences and apply them immediately

### Requirement 16: Offline Resilience and Error Handling

**User Story:** As a user, I want the app to handle errors gracefully, so that I don't lose my work during network issues.

#### Acceptance Criteria

1. WHEN a network error occurs during save, THE Error_Handler SHALL display a retry option with the pending changes preserved
2. WHEN a server error occurs, THE Error_Handler SHALL display a user-friendly error message in the user's language
3. WHEN loading data fails, THE Loading_State SHALL display a retry button instead of crashing
4. IF a mutation fails, THEN THE Optimistic_Update SHALL rollback to the previous state

### Requirement 17: Keyboard Navigation and Accessibility

**User Story:** As a user, I want to navigate the app using keyboard shortcuts, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN a user presses Tab, THE Focus_System SHALL navigate through interactive elements in logical order
2. WHEN a user presses Escape in Detail Panel, THE Panel SHALL close and return focus to the Tower View
3. WHEN a user presses arrow keys in Tower View, THE Focus_System SHALL navigate between sibling nodes
4. THE UI_Components SHALL have proper ARIA labels for screen reader compatibility
5. THE Color_Contrast SHALL meet WCAG AA standards for both dark and light themes

### Requirement 18: Node Duplication

**User Story:** As a user, I want to duplicate a node's subtree, so that I can reuse similar planning structures.

#### Acceptance Criteria

1. WHEN a user clicks "Duplicate subtree" on a node, THE Duplication_System SHALL create a copy of the node and all its descendants
2. WHEN duplicating, THE Duplication_System SHALL place the copy as a sibling if space available, or prompt for target location
3. WHEN duplication completes, THE UI SHALL highlight the newly created subtree

### Requirement 19: Data Export

**User Story:** As a user, I want to export my canvas data, so that I can backup or share my planning structure.

#### Acceptance Criteria

1. WHEN a user clicks "Export Canvas", THE Export_System SHALL generate a JSON file containing the canvas, trees, and all nodes
2. WHEN exporting, THE Export_System SHALL include all node metadata (title, description, status, due_date)
3. THE Export_File SHALL be downloadable with filename format "canvas-{name}-{date}.json"
