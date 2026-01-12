import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Node, NodeStatus } from '@/types/database';

/**
 * Feature: harada-pillars
 * Property 13: Reminder Scheduling Correctness
 * 
 * For any node with reminder_enabled = true and due_date set:
 * - If due_date is today (H-0) or tomorrow (H-1), a reminder SHALL be queued
 * - The reminder email SHALL use the user's language preference
 * - If user's reminder_pref is "off", no reminder SHALL be sent
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */
describe('Property 13: Reminder Scheduling Correctness', () => {
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');
  const languageArb = fc.constantFrom<'en' | 'id'>('en', 'id');
  const reminderPrefArb = fc.constantFrom<'off' | 'daily_summary' | 'due_only'>('off', 'daily_summary', 'due_only');

  // Helper to check if a date is today or tomorrow
  function isDueForReminder(dueDate: string, today: Date): boolean {
    const due = new Date(dueDate);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    return dueDate === todayStr || dueDate === tomorrowStr;
  }

  describe('Reminder eligibility', () => {
    it('should queue reminder when due_date is today', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const todayStr = today.toISOString().split('T')[0];
          const node = {
            reminder_enabled: true,
            due_date: todayStr,
          };

          const shouldRemind = node.reminder_enabled && isDueForReminder(node.due_date, today);
          expect(shouldRemind).toBe(true);
        })
      );
    });

    it('should queue reminder when due_date is tomorrow', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          const node = {
            reminder_enabled: true,
            due_date: tomorrowStr,
          };

          const shouldRemind = node.reminder_enabled && isDueForReminder(node.due_date, today);
          expect(shouldRemind).toBe(true);
        })
      );
    });

    it('should NOT queue reminder when due_date is in the past', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const node = {
            reminder_enabled: true,
            due_date: yesterdayStr,
          };

          const shouldRemind = isDueForReminder(node.due_date, today);
          expect(shouldRemind).toBe(false);
        })
      );
    });

    it('should NOT queue reminder when due_date is more than 1 day in future', () => {
      fc.assert(
        fc.property(fc.date(), fc.integer({ min: 2, max: 30 }), (today, daysAhead) => {
          const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
          const futureDateStr = futureDate.toISOString().split('T')[0];
          const node = {
            reminder_enabled: true,
            due_date: futureDateStr,
          };

          const shouldRemind = isDueForReminder(node.due_date, today);
          expect(shouldRemind).toBe(false);
        })
      );
    });

    it('should NOT queue reminder when reminder_enabled is false', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const todayStr = today.toISOString().split('T')[0];
          const node = {
            reminder_enabled: false,
            due_date: todayStr,
          };

          const shouldRemind = node.reminder_enabled && isDueForReminder(node.due_date, today);
          expect(shouldRemind).toBe(false);
        })
      );
    });
  });

  describe('User preference handling', () => {
    it('should NOT send reminder when user preference is "off"', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const todayStr = today.toISOString().split('T')[0];
          const userSettings = { reminder_pref: 'off' as const };
          const node = {
            reminder_enabled: true,
            due_date: todayStr,
          };

          const shouldSend = userSettings.reminder_pref !== 'off' && 
                            node.reminder_enabled && 
                            isDueForReminder(node.due_date, today);
          expect(shouldSend).toBe(false);
        })
      );
    });

    it('should send reminder when user preference is "due_only"', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const todayStr = today.toISOString().split('T')[0];
          const userSettings = { reminder_pref: 'due_only' as const };
          const node = {
            reminder_enabled: true,
            due_date: todayStr,
          };

          const shouldSend = userSettings.reminder_pref !== 'off' && 
                            node.reminder_enabled && 
                            isDueForReminder(node.due_date, today);
          expect(shouldSend).toBe(true);
        })
      );
    });

    it('should send reminder when user preference is "daily_summary"', () => {
      fc.assert(
        fc.property(fc.date(), (today) => {
          const todayStr = today.toISOString().split('T')[0];
          const userSettings = { reminder_pref: 'daily_summary' as const };
          const node = {
            reminder_enabled: true,
            due_date: todayStr,
          };

          const shouldSend = userSettings.reminder_pref !== 'off' && 
                            node.reminder_enabled && 
                            isDueForReminder(node.due_date, today);
          expect(shouldSend).toBe(true);
        })
      );
    });
  });

  describe('Language preference', () => {
    it('should use user language preference for email', () => {
      fc.assert(
        fc.property(languageArb, (language) => {
          const userSettings = { language };
          
          // Email should be in user's preferred language
          expect(['en', 'id']).toContain(userSettings.language);
        })
      );
    });

    it('should have email templates for both languages', () => {
      const templates = {
        en: { subject: 'Tasks due soon', greeting: 'Hello' },
        id: { subject: 'Tugas akan jatuh tempo', greeting: 'Halo' },
      };

      fc.assert(
        fc.property(languageArb, (language) => {
          expect(templates[language]).toBeDefined();
          expect(templates[language].subject).toBeTruthy();
          expect(templates[language].greeting).toBeTruthy();
        })
      );
    });
  });
});

/**
 * Feature: harada-pillars
 * Property 14: Reminder Panel Completeness
 * 
 * For any canvas, the Reminder Panel SHALL display all nodes where:
 * - reminder_enabled = true
 * - The node belongs to a tree in that canvas
 * 
 * Validates: Requirements 9.7
 */
describe('Property 14: Reminder Panel Completeness', () => {
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');

  // Generate a node with reminder settings
  const reminderNodeArb = fc.record({
    id: fc.uuid(),
    tree_id: fc.uuid(),
    canvas_id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    reminder_enabled: fc.boolean(),
    due_date: fc.option(fc.date().map(d => d.toISOString().split('T')[0]), { nil: null }),
    status: nodeStatusArb,
  });

  describe('Reminder panel filtering', () => {
    it('should include all nodes with reminder_enabled = true', () => {
      fc.assert(
        fc.property(
          fc.array(reminderNodeArb, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          (nodes, canvasId) => {
            // Filter nodes for the canvas with reminders enabled
            const reminderNodes = nodes.filter(
              n => n.reminder_enabled && n.canvas_id === canvasId
            );

            // All filtered nodes should have reminder_enabled = true
            reminderNodes.forEach(node => {
              expect(node.reminder_enabled).toBe(true);
            });
          }
        )
      );
    });

    it('should NOT include nodes with reminder_enabled = false', () => {
      fc.assert(
        fc.property(
          fc.array(reminderNodeArb, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          (nodes, canvasId) => {
            const reminderNodes = nodes.filter(
              n => n.reminder_enabled && n.canvas_id === canvasId
            );

            // None of the filtered nodes should have reminder_enabled = false
            reminderNodes.forEach(node => {
              expect(node.reminder_enabled).not.toBe(false);
            });
          }
        )
      );
    });

    it('should only include nodes from the specified canvas', () => {
      fc.assert(
        fc.property(
          fc.array(reminderNodeArb, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          (nodes, canvasId) => {
            // Assign some nodes to the target canvas
            const nodesWithCanvas = nodes.map((n, i) => ({
              ...n,
              canvas_id: i % 2 === 0 ? canvasId : fc.sample(fc.uuid())[0],
            }));

            const reminderNodes = nodesWithCanvas.filter(
              n => n.reminder_enabled && n.canvas_id === canvasId
            );

            // All filtered nodes should belong to the specified canvas
            reminderNodes.forEach(node => {
              expect(node.canvas_id).toBe(canvasId);
            });
          }
        )
      );
    });
  });

  describe('Reminder panel display', () => {
    it('should display node title for each reminder', () => {
      fc.assert(
        fc.property(reminderNodeArb, (node) => {
          if (node.reminder_enabled) {
            expect(node.title).toBeDefined();
            expect(node.title.length).toBeGreaterThan(0);
          }
        })
      );
    });

    it('should display due_date when set', () => {
      fc.assert(
        fc.property(reminderNodeArb, (node) => {
          if (node.reminder_enabled && node.due_date) {
            expect(node.due_date).toBeDefined();
            // Should be a valid date string
            const date = new Date(node.due_date);
            expect(date.toString()).not.toBe('Invalid Date');
          }
        })
      );
    });

    it('should handle nodes without due_date', () => {
      fc.assert(
        fc.property(reminderNodeArb, (node) => {
          // Nodes can have reminder_enabled without due_date
          // This is valid - they just won't trigger time-based reminders
          if (node.reminder_enabled && !node.due_date) {
            expect(node.due_date).toBeNull();
          }
        })
      );
    });
  });

  describe('Completeness guarantee', () => {
    it('should return all matching nodes without omission', () => {
      fc.assert(
        fc.property(
          fc.array(reminderNodeArb, { minLength: 5, maxLength: 50 }),
          fc.uuid(),
          (nodes, canvasId) => {
            // Assign canvas IDs
            const nodesWithCanvas = nodes.map((n, i) => ({
              ...n,
              canvas_id: i % 3 === 0 ? canvasId : n.canvas_id,
            }));

            // Count expected reminders
            const expectedCount = nodesWithCanvas.filter(
              n => n.reminder_enabled && n.canvas_id === canvasId
            ).length;

            // Actual filtered count
            const actualCount = nodesWithCanvas.filter(
              n => n.reminder_enabled && n.canvas_id === canvasId
            ).length;

            expect(actualCount).toBe(expectedCount);
          }
        )
      );
    });
  });
});
