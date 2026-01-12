import { getCanvas } from '@/app/actions/canvas';
import { getTree } from '@/app/actions/tree';
import { getRootNode, getTreeNodes } from '@/app/actions/node';
import { notFound } from 'next/navigation';
import { ResponsiveTower } from '@/components/tower/responsive-tower';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Node } from '@/types/database';

interface TreePageProps {
  params: Promise<{ canvasId: string; treeId: string }>;
}

export default async function TreePage({ params }: TreePageProps) {
  const { canvasId, treeId } = await params;
  
  const [canvasResult, treeResult, rootNodeResult, nodesResult] = await Promise.all([
    getCanvas(canvasId),
    getTree(treeId),
    getRootNode(treeId),
    getTreeNodes(treeId),
  ]);

  if (canvasResult.error || !canvasResult.data) {
    notFound();
  }

  if (treeResult.error || !treeResult.data) {
    notFound();
  }

  const canvas = canvasResult.data;
  const tree = treeResult.data;
  const rootNode: Node | null = rootNodeResult.data || null;
  const nodes = nodesResult.data || [];

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: canvas.name, href: `/app/canvas/${canvasId}` },
          { label: tree.title },
        ]}
      />

      {/* Tower View (responsive) */}
      <div className="flex-1 relative overflow-hidden">
        <ResponsiveTower
          treeId={treeId}
          canvasId={canvasId}
          nodes={nodes}
          rootNode={rootNode}
        />
      </div>
    </div>
  );
}
