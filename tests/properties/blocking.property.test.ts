import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isInheritedBlocked, computeInheritedBlockedStatus } from '@/lib/blocking';
import type { Node, NodeStatus } from '@/types/database';

/**
 * Feature: harada-pillars
 * Property 4: Blocking Propagation Rules
 * 
 * For any node in the tree:
 * - If a Level 2 node has status "blocked", ALL its descendants SHALL have inherited_blocked = true
 * - If a Level 1 node has status "blocked", its children SHALL NOT have inherited_blocked = true
 * - If a node at Level 3-7 has status "blocked" and is NOT under an inherited_blocked path,
 *   its children SHALL NOT automatically have inherited_blocked = true
 * 
 * Validates: Requirements 4.4, 4.5, 4.6
 */
describe('Property 4: Blocking Propagation Rules', () => {
  const nodeStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress', 'blocked');
  const nonBlockedStatusArb = fc.constantFrom<NodeStatus>('done', 'in_progress');

  describe('Level 2 blocking propagates to all descendants', () => {
    it('should return true for any node with a blocked Level 2 ancestor', () => {
      const descendantLevelArb = fc.integer({ min: 3, max: 7 });

      fc.assert(
        fc.property(descendantLevelArb, nodeStatusArb, (level, status) => {
          const node = { level };
          const ancestors = [
            { level: 1, status: 'in_progress' as NodeStatus },
            { level: 2, status: 'blocked' as NodeStatus },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(true);
        })
      );
    });

    it('should return true for Level 3 node when Level 2 is blocked', () => {
      fc.assert(
        fc.property(nodeStatusArb, (status) => {
          const node = { level: 3 };
          const ancestors = [
            { level: 1, status: 'in_progress' as NodeStatus },
            { level: 2, status: 'blocked' as NodeStatus },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(true);
        })
      );
    });

    it('should return true for Level 7 node when Level 2 is blocked', () => {
      fc.assert(
        fc.property(nodeStatusArb, (status) => {
          const node = { level: 7 };
          const ancestors = [
            { level: 1, status: 'in_progress' as NodeStatus },
            { level: 2, status: 'blocked' as NodeStatus },
            { level: 3, status: 'done' as NodeStatus },
            { level: 4, status: 'in_progress' as NodeStatus },
            { level: 5, status: 'done' as NodeStatus },
            { level: 6, status: 'in_progress' as NodeStatus },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(true);
        })
      );
    });
  });

  describe('Level 1 blocking does NOT propagate', () => {
    it('should return false for Level 2 node even when Level 1 is blocked', () => {
      fc.assert(
        fc.property(nodeStatusArb, (status) => {
          const node = { level: 2 };
          const ancestors = [
            { level: 1, status: 'blocked' as NodeStatus },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(false);
        })
      );
    });

    it('should return false for any descendant when only Level 1 is blocked', () => {
      const descendantLevelArb = fc.integer({ min: 2, max: 7 });

      fc.assert(
        fc.property(descendantLevelArb, nodeStatusArb, nonBlockedStatusArb, (level, nodeStatus, l2Status) => {
          const node = { level };
          // Build ancestors with blocked Level 1 but non-blocked Level 2
          const ancestors: { level: number; status: NodeStatus }[] = [
            { level: 1, status: 'blocked' },
          ];
          
          if (level > 2) {
            ancestors.push({ level: 2, status: l2Status });
          }

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(false);
        })
      );
    });
  });

  describe('Level 3-7 blocking does NOT propagate to children', () => {
    it('should return false when Level 3 is blocked but Level 2 is not', () => {
      fc.assert(
        fc.property(nodeStatusArb, (status) => {
          const node = { level: 4 };
          const ancestors = [
            { level: 1, status: 'in_progress' as NodeStatus },
            { level: 2, status: 'in_progress' as NodeStatus },
            { level: 3, status: 'blocked' as NodeStatus },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(false);
        })
      );
    });

    it('should return false when any Level 3-6 is blocked but Level 2 is not', () => {
      const blockedLevelArb = fc.integer({ min: 3, max: 6 });
      const childLevelArb = fc.integer({ min: 4, max: 7 });

      fc.assert(
        fc.property(blockedLevelArb, childLevelArb, nonBlockedStatusArb, (blockedLevel, childLevel, l2Status) => {
          // Only test when child is deeper than blocked level
          fc.pre(childLevel > blockedLevel);

          const node = { level: childLevel };
          const ancestors: { level: number; status: NodeStatus }[] = [
            { level: 1, status: 'in_progress' },
            { level: 2, status: l2Status },
          ];

          // Add ancestors up to the blocked level
          for (let l = 3; l < childLevel; l++) {
            ancestors.push({
              level: l,
              status: l === blockedLevel ? 'blocked' : 'in_progress',
            });
          }

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(false);
        })
      );
    });
  });

  describe('Non-blocked Level 2 does not cause inherited blocking', () => {
    it('should return false when Level 2 is not blocked', () => {
      const descendantLevelArb = fc.integer({ min: 3, max: 7 });

      fc.assert(
        fc.property(descendantLevelArb, nonBlockedStatusArb, (level, l2Status) => {
          const node = { level };
          const ancestors = [
            { level: 1, status: 'in_progress' as NodeStatus },
            { level: 2, status: l2Status },
          ];

          const result = isInheritedBlocked(node, ancestors);
          expect(result).toBe(false);
        })
      );
    });
  });
});
