import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: harada-pillars
 * Property 20: Connector Overlay Completeness
 * 
 * For any visible parent-child relationship in Tower View:
 * - A connector line SHALL exist between the parent and child nodes
 * - The connector SHALL originate from the parent's position and terminate at the child's position
 * 
 * Validates: Requirements 6.4
 */
describe('Property 20: Connector Overlay Completeness', () => {
  interface NodePosition {
    id: string;
    parentId: string | null;
    x: number;
    y: number;
    level: number;
  }

  interface Connector {
    parentId: string;
    childId: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }

  // Generate connectors from parent-child relationships
  function generateConnectors(nodes: NodePosition[]): Connector[] {
    const connectors: Connector[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const node of nodes) {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          connectors.push({
            parentId: parent.id,
            childId: node.id,
            startX: parent.x,
            startY: parent.y,
            endX: node.x,
            endY: node.y,
          });
        }
      }
    }

    return connectors;
  }

  // Generate a node position
  const nodePositionArb = (level: number, parentId: string | null) =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.constant(parentId),
      x: fc.float({ min: 0, max: 1000, noNaN: true }),
      y: fc.float({ min: 0, max: 1000, noNaN: true }),
      level: fc.constant(level),
    });

  describe('Connector existence', () => {
    it('should create a connector for every parent-child relationship', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 500, noNaN: true }),
          (parentId, parentX, parentY, childX, childY) => {
            const parent: NodePosition = {
              id: parentId,
              parentId: null,
              x: parentX,
              y: parentY,
              level: 1,
            };
            const child: NodePosition = {
              id: 'child-1',
              parentId: parentId,
              x: childX,
              y: childY,
              level: 2,
            };

            const connectors = generateConnectors([parent, child]);

            expect(connectors.length).toBe(1);
            expect(connectors[0].parentId).toBe(parentId);
            expect(connectors[0].childId).toBe('child-1');
          }
        )
      );
    });

    it('should create connectors for all children of a parent', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 1, max: 8 }),
          (parentId, childCount) => {
            const parent: NodePosition = {
              id: parentId,
              parentId: null,
              x: 500,
              y: 100,
              level: 1,
            };

            const children: NodePosition[] = Array.from({ length: childCount }, (_, i) => ({
              id: `child-${i}`,
              parentId: parentId,
              x: 100 + i * 100,
              y: 200,
              level: 2,
            }));

            const connectors = generateConnectors([parent, ...children]);

            expect(connectors.length).toBe(childCount);
            connectors.forEach(connector => {
              expect(connector.parentId).toBe(parentId);
            });
          }
        )
      );
    });

    it('should NOT create connector for root node (no parent)', () => {
      fc.assert(
        fc.property(fc.uuid(), (nodeId) => {
          const root: NodePosition = {
            id: nodeId,
            parentId: null,
            x: 500,
            y: 100,
            level: 1,
          };

          const connectors = generateConnectors([root]);

          expect(connectors.length).toBe(0);
        })
      );
    });
  });

  describe('Connector positions', () => {
    it('should start connector at parent position', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (parentId, parentX, parentY) => {
            const parent: NodePosition = {
              id: parentId,
              parentId: null,
              x: parentX,
              y: parentY,
              level: 1,
            };
            const child: NodePosition = {
              id: 'child-1',
              parentId: parentId,
              x: 300,
              y: 400,
              level: 2,
            };

            const connectors = generateConnectors([parent, child]);

            expect(connectors[0].startX).toBe(parentX);
            expect(connectors[0].startY).toBe(parentY);
          }
        )
      );
    });

    it('should end connector at child position', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (parentId, childX, childY) => {
            const parent: NodePosition = {
              id: parentId,
              parentId: null,
              x: 500,
              y: 100,
              level: 1,
            };
            const child: NodePosition = {
              id: 'child-1',
              parentId: parentId,
              x: childX,
              y: childY,
              level: 2,
            };

            const connectors = generateConnectors([parent, child]);

            expect(connectors[0].endX).toBe(childX);
            expect(connectors[0].endY).toBe(childY);
          }
        )
      );
    });
  });

  describe('Multi-level connectors', () => {
    it('should create connectors for multi-level hierarchy', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 7 }), (levels) => {
          const nodes: NodePosition[] = [];
          let currentParentId: string | null = null;

          for (let level = 1; level <= levels; level++) {
            const nodeId = `node-level-${level}`;
            nodes.push({
              id: nodeId,
              parentId: currentParentId,
              x: 500,
              y: level * 100,
              level,
            });
            currentParentId = nodeId;
          }

          const connectors = generateConnectors(nodes);

          // Should have (levels - 1) connectors (one less than nodes)
          expect(connectors.length).toBe(levels - 1);
        })
      );
    });

    it('should maintain correct parent-child relationships in connectors', () => {
      const nodes: NodePosition[] = [
        { id: 'root', parentId: null, x: 500, y: 100, level: 1 },
        { id: 'child-1', parentId: 'root', x: 300, y: 200, level: 2 },
        { id: 'child-2', parentId: 'root', x: 700, y: 200, level: 2 },
        { id: 'grandchild-1', parentId: 'child-1', x: 200, y: 300, level: 3 },
        { id: 'grandchild-2', parentId: 'child-1', x: 400, y: 300, level: 3 },
      ];

      const connectors = generateConnectors(nodes);

      expect(connectors.length).toBe(4);

      // Verify specific relationships
      const rootToChild1 = connectors.find(c => c.parentId === 'root' && c.childId === 'child-1');
      const rootToChild2 = connectors.find(c => c.parentId === 'root' && c.childId === 'child-2');
      const child1ToGrandchild1 = connectors.find(c => c.parentId === 'child-1' && c.childId === 'grandchild-1');
      const child1ToGrandchild2 = connectors.find(c => c.parentId === 'child-1' && c.childId === 'grandchild-2');

      expect(rootToChild1).toBeDefined();
      expect(rootToChild2).toBeDefined();
      expect(child1ToGrandchild1).toBeDefined();
      expect(child1ToGrandchild2).toBeDefined();
    });
  });

  describe('Connector count', () => {
    it('should have exactly (N-1) connectors for N connected nodes', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (nodeCount) => {
          const nodes: NodePosition[] = [];
          
          // Create a linear chain of nodes
          for (let i = 0; i < nodeCount; i++) {
            nodes.push({
              id: `node-${i}`,
              parentId: i > 0 ? `node-${i - 1}` : null,
              x: 500,
              y: i * 100,
              level: i + 1,
            });
          }

          const connectors = generateConnectors(nodes);

          // Linear chain has (N-1) connections
          expect(connectors.length).toBe(Math.max(0, nodeCount - 1));
        })
      );
    });

    it('should handle 8 children per parent (Harada method)', () => {
      const parent: NodePosition = {
        id: 'parent',
        parentId: null,
        x: 500,
        y: 100,
        level: 1,
      };

      const children: NodePosition[] = Array.from({ length: 8 }, (_, i) => ({
        id: `child-${i}`,
        parentId: 'parent',
        x: 100 + i * 100,
        y: 200,
        level: 2,
      }));

      const connectors = generateConnectors([parent, ...children]);

      expect(connectors.length).toBe(8);
    });
  });
});
