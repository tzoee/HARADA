import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeProgress, computeLeafProgress } from '@/lib/progress';
import type { NodeStatus } from '@/types/database';

/**
 * Feature: harada-pillars
 * Property 1: Leaf Node Progress Values
 * 
 * For any leaf node (Level 7), the progress value SHALL be exactly:
 * - 1 when status is "done"
 * - 0.5 when status is "in_progress"
 * - 0 when status is "blocked"
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3
 */
describe('Property 1: Leaf Node Progress Values', () => {
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');

  it('should return 1 for done status', () => {
    fc.assert(
      fc.property(fc.constant('done' as NodeStatus), (status) => {
        const progress = computeLeafProgress(status);
        expect(progress).toBe(1);
      })
    );
  });

  it('should return 0.5 for in_progress status', () => {
    fc.assert(
      fc.property(fc.constant('in_progress' as NodeStatus), (status) => {
        const progress = computeLeafProgress(status);
        expect(progress).toBe(0.5);
      })
    );
  });

  it('should return 0 for blocked status', () => {
    fc.assert(
      fc.property(fc.constant('blocked' as NodeStatus), (status) => {
        const progress = computeLeafProgress(status);
        expect(progress).toBe(0);
      })
    );
  });

  it('should return correct progress for any leaf node (Level 7) status', () => {
    fc.assert(
      fc.property(nodeStatusArb, (status) => {
        const node = { level: 7, status };
        const progress = computeProgress(node, [], false);

        switch (status) {
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

  it('should treat nodes with no children as leaf nodes regardless of level', () => {
    const levelArb = fc.integer({ min: 1, max: 6 });

    fc.assert(
      fc.property(levelArb, nodeStatusArb, (level, status) => {
        const node = { level, status };
        const progress = computeProgress(node, [], false);

        // Nodes with no children behave like leaf nodes
        switch (status) {
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
 * Feature: harada-pillars
 * Property 2: Non-Leaf Node Progress Calculation
 * 
 * For any non-leaf node with children, the progress value SHALL equal
 * the arithmetic mean of all children's progress values.
 * 
 * Validates: Requirements 5.4
 */
describe('Property 2: Non-Leaf Node Progress Calculation', () => {
  // Generate array of 1-8 child progress values between 0 and 1
  const childProgressArb = fc.array(
    fc.float({ min: 0, max: 1, noNaN: true }),
    { minLength: 1, maxLength: 8 }
  );

  const nonLeafLevelArb = fc.integer({ min: 1, max: 6 });
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');

  it('should calculate progress as average of children for any non-leaf node', () => {
    fc.assert(
      fc.property(nonLeafLevelArb, nodeStatusArb, childProgressArb, (level, status, childProgresses) => {
        const children = childProgresses.map((progress) => ({ progress }));
        const node = { level, status };

        const expectedProgress = childProgresses.reduce((a, b) => a + b, 0) / childProgresses.length;
        const actualProgress = computeProgress(node, children, false);

        expect(actualProgress).toBeCloseTo(expectedProgress, 10);
      })
    );
  });

  it('should return 0 when all children have 0 progress', () => {
    fc.assert(
      fc.property(nonLeafLevelArb, nodeStatusArb, fc.integer({ min: 1, max: 8 }), (level, status, childCount) => {
        const children = Array(childCount).fill(null).map(() => ({ progress: 0 }));
        const node = { level, status };

        const progress = computeProgress(node, children, false);
        expect(progress).toBe(0);
      })
    );
  });

  it('should return 1 when all children have 1 progress', () => {
    fc.assert(
      fc.property(nonLeafLevelArb, nodeStatusArb, fc.integer({ min: 1, max: 8 }), (level, status, childCount) => {
        const children = Array(childCount).fill(null).map(() => ({ progress: 1 }));
        const node = { level, status };

        const progress = computeProgress(node, children, false);
        expect(progress).toBe(1);
      })
    );
  });

  it('should return 0.5 when all children have 0.5 progress', () => {
    fc.assert(
      fc.property(nonLeafLevelArb, nodeStatusArb, fc.integer({ min: 1, max: 8 }), (level, status, childCount) => {
        const children = Array(childCount).fill(null).map(() => ({ progress: 0.5 }));
        const node = { level, status };

        const progress = computeProgress(node, children, false);
        expect(progress).toBeCloseTo(0.5, 10);
      })
    );
  });

  it('should handle exactly 8 children (Harada method)', () => {
    fc.assert(
      fc.property(
        nonLeafLevelArb,
        nodeStatusArb,
        fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 8, maxLength: 8 }),
        (level, status, childProgresses) => {
          const children = childProgresses.map((progress) => ({ progress }));
          const node = { level, status };

          const expectedProgress = childProgresses.reduce((a, b) => a + b, 0) / 8;
          const actualProgress = computeProgress(node, children, false);

          expect(actualProgress).toBeCloseTo(expectedProgress, 10);
        }
      )
    );
  });
});

/**
 * Feature: harada-pillars
 * Property 3: Inherited Blocked Progress Override
 * 
 * For any node that is under an inherited_blocked path (has a Level 2 ancestor
 * with status "blocked"), the progress value SHALL be 0 regardless of the
 * node's own status or children's progress.
 * 
 * Validates: Requirements 4.7, 5.5
 */
describe('Property 3: Inherited Blocked Progress Override', () => {
  const levelArb = fc.integer({ min: 3, max: 7 });
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');
  const childProgressArb = fc.array(
    fc.float({ min: 0, max: 1, noNaN: true }),
    { minLength: 0, maxLength: 8 }
  );

  it('should return 0 progress for any inherited blocked node regardless of status', () => {
    fc.assert(
      fc.property(levelArb, nodeStatusArb, (level, status) => {
        const node = { level, status };
        const progress = computeProgress(node, [], true);

        expect(progress).toBe(0);
      })
    );
  });

  it('should return 0 progress for inherited blocked node even with high-progress children', () => {
    fc.assert(
      fc.property(levelArb, nodeStatusArb, fc.integer({ min: 1, max: 8 }), (level, status, childCount) => {
        const children = Array(childCount).fill(null).map(() => ({ progress: 1 }));
        const node = { level, status };

        const progress = computeProgress(node, children, true);
        expect(progress).toBe(0);
      })
    );
  });

  it('should return 0 progress for inherited blocked node with any children progress', () => {
    fc.assert(
      fc.property(levelArb, nodeStatusArb, childProgressArb, (level, status, childProgresses) => {
        const children = childProgresses.map((progress) => ({ progress }));
        const node = { level, status };

        const progress = computeProgress(node, children, true);
        expect(progress).toBe(0);
      })
    );
  });

  it('should return non-zero progress when NOT inherited blocked', () => {
    fc.assert(
      fc.property(levelArb, (level) => {
        const node = { level, status: 'done' as NodeStatus };
        const progress = computeProgress(node, [], false);

        // When not inherited blocked and status is done, progress should be 1
        expect(progress).toBe(1);
      })
    );
  });
});
