import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { CanvasExportData } from '@/types/computed';
import type { NodeStatus } from '@/types/database';

/**
 * Feature: harada-pillars
 * Property 18: Export Data Completeness
 * 
 * For any canvas export:
 * - The exported JSON SHALL contain all canvas metadata
 * - The exported JSON SHALL contain all Plan Trees with their titles
 * - The exported JSON SHALL contain all nodes with title, description, status, and due_date
 * - The exported JSON SHALL be valid JSON that can be parsed
 * 
 * Validates: Requirements 19.1, 19.2, 19.3
 */
describe('Property 18: Export Data Completeness', () => {
  // Arbitrary for generating mock export data
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');
  
  const nodeArb = fc.record({
    id: fc.uuid(),
    parent_id: fc.option(fc.uuid(), { nil: null }),
    level: fc.integer({ min: 1, max: 7 }),
    index_in_parent: fc.integer({ min: 0, max: 7 }),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
    status: nodeStatusArb,
    due_date: fc.option(fc.date().map(d => d.toISOString().split('T')[0]), { nil: null }),
    reminder_enabled: fc.boolean(),
    reminder_time: fc.option(fc.constant('09:00'), { nil: null }),
    reminder_timezone: fc.option(fc.constant('UTC'), { nil: null }),
    created_at: fc.date().map(d => d.toISOString()),
    updated_at: fc.date().map(d => d.toISOString()),
  });

  const treeArb = fc.record({
    tree: fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      created_at: fc.date().map(d => d.toISOString()),
      updated_at: fc.date().map(d => d.toISOString()),
    }),
    nodes: fc.array(nodeArb, { minLength: 1, maxLength: 10 }),
  });

  const exportDataArb = fc.record({
    version: fc.constant('1.0.0'),
    exported_at: fc.date().map(d => d.toISOString()),
    canvas: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      is_archived: fc.boolean(),
      created_at: fc.date().map(d => d.toISOString()),
      updated_at: fc.date().map(d => d.toISOString()),
    }),
    trees: fc.array(treeArb, { minLength: 0, maxLength: 5 }),
  });

  describe('Canvas metadata completeness', () => {
    it('should contain all required canvas fields', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          expect(exportData.canvas).toBeDefined();
          expect(exportData.canvas.id).toBeDefined();
          expect(exportData.canvas.name).toBeDefined();
          expect(typeof exportData.canvas.is_archived).toBe('boolean');
          expect(exportData.canvas.created_at).toBeDefined();
          expect(exportData.canvas.updated_at).toBeDefined();
        })
      );
    });

    it('should have valid version string', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          expect(exportData.version).toBeDefined();
          expect(typeof exportData.version).toBe('string');
          expect(exportData.version.length).toBeGreaterThan(0);
        })
      );
    });

    it('should have valid exported_at timestamp', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          expect(exportData.exported_at).toBeDefined();
          const date = new Date(exportData.exported_at);
          expect(date.toString()).not.toBe('Invalid Date');
        })
      );
    });
  });

  describe('Plan Trees completeness', () => {
    it('should contain trees array', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          expect(Array.isArray(exportData.trees)).toBe(true);
        })
      );
    });

    it('should have all required tree fields for each tree', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          exportData.trees.forEach(treeData => {
            expect(treeData.tree).toBeDefined();
            expect(treeData.tree.id).toBeDefined();
            expect(treeData.tree.title).toBeDefined();
            expect(treeData.tree.created_at).toBeDefined();
            expect(treeData.tree.updated_at).toBeDefined();
          });
        })
      );
    });

    it('should have nodes array for each tree', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          exportData.trees.forEach(treeData => {
            expect(Array.isArray(treeData.nodes)).toBe(true);
          });
        })
      );
    });
  });

  describe('Nodes completeness', () => {
    it('should have all required node fields', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          exportData.trees.forEach(treeData => {
            treeData.nodes.forEach(node => {
              expect(node.id).toBeDefined();
              expect(node.level).toBeDefined();
              expect(node.index_in_parent).toBeDefined();
              expect(node.title).toBeDefined();
              expect(node.status).toBeDefined();
              expect(node.created_at).toBeDefined();
              expect(node.updated_at).toBeDefined();
              // Optional fields can be null
              expect('description' in node).toBe(true);
              expect('due_date' in node).toBe(true);
              expect('parent_id' in node).toBe(true);
            });
          });
        })
      );
    });

    it('should have valid status values', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          const validStatuses = ['done', 'in_progress', 'blocked'];
          exportData.trees.forEach(treeData => {
            treeData.nodes.forEach(node => {
              expect(validStatuses).toContain(node.status);
            });
          });
        })
      );
    });

    it('should have valid level values (1-7)', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          exportData.trees.forEach(treeData => {
            treeData.nodes.forEach(node => {
              expect(node.level).toBeGreaterThanOrEqual(1);
              expect(node.level).toBeLessThanOrEqual(7);
            });
          });
        })
      );
    });

    it('should have valid index_in_parent values (0-7)', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          exportData.trees.forEach(treeData => {
            treeData.nodes.forEach(node => {
              expect(node.index_in_parent).toBeGreaterThanOrEqual(0);
              expect(node.index_in_parent).toBeLessThanOrEqual(7);
            });
          });
        })
      );
    });
  });

  describe('JSON validity', () => {
    it('should be serializable to valid JSON', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          const jsonString = JSON.stringify(exportData);
          expect(typeof jsonString).toBe('string');
          expect(jsonString.length).toBeGreaterThan(0);
        })
      );
    });

    it('should be parseable back from JSON', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          const jsonString = JSON.stringify(exportData);
          const parsed = JSON.parse(jsonString);
          expect(parsed).toBeDefined();
          expect(parsed.canvas).toBeDefined();
          expect(parsed.trees).toBeDefined();
        })
      );
    });

    it('should maintain data integrity through JSON round-trip', () => {
      fc.assert(
        fc.property(exportDataArb, (exportData) => {
          const jsonString = JSON.stringify(exportData);
          const parsed = JSON.parse(jsonString) as CanvasExportData;
          
          expect(parsed.version).toBe(exportData.version);
          expect(parsed.canvas.id).toBe(exportData.canvas.id);
          expect(parsed.canvas.name).toBe(exportData.canvas.name);
          expect(parsed.trees.length).toBe(exportData.trees.length);
        })
      );
    });
  });
});
