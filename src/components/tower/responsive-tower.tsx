'use client';

import { useEffect, useState } from 'react';
import type { Node } from '@/types/database';
import { TowerView } from './tower-view';
import { StackedPillarsView } from './stacked-pillars-view';

interface ResponsiveTowerProps {
  treeId: string;
  canvasId: string;
  nodes: Node[];
  rootNode: Node | null;
}

export function ResponsiveTower({ treeId, canvasId, nodes, rootNode }: ResponsiveTowerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <StackedPillarsView
        treeId={treeId}
        canvasId={canvasId}
        nodes={nodes}
        rootNode={rootNode}
      />
    );
  }

  return (
    <TowerView
      treeId={treeId}
      canvasId={canvasId}
      nodes={nodes}
      rootNode={rootNode}
    />
  );
}
