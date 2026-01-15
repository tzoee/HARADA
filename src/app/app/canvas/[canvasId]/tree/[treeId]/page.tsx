import { getCanvas } from '@/app/actions/canvas';
import { getTree } from '@/app/actions/tree';
import { getRootNode, getTreeNodes } from '@/app/actions/node';
import { getChecklistItemsForNodes } from '@/app/actions/checklist';
import { notFound } from 'next/navigation';
import { ResponsiveCanvas } from '@/components/canvas';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Node, ChecklistItem } from '@/types/database';

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

  // Get Level 3 node IDs for checklist fetching
  const level3NodeIds = nodes.filter(n => n.level === 3).map(n => n.id);
  
  // Fetch checklist items for all Level 3 nodes
  let checklistItemsByNode = new Map<string, ChecklistItem[]>();
  if (level3NodeIds.length > 0) {
    const checklistResult = await getChecklistItemsForNodes(level3NodeIds);
    if (checklistResult.data) {
      checklistItemsByNode = checklistResult.data;
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: canvas.name, href: `/app/canvas/${canvasId}` },
          { label: tree.title },
        ]}
      />

      {/* Infinite Canvas View */}
      <div className="flex-1 relative overflow-hidden">
        <ResponsiveCanvas
          treeId={treeId}
          canvasId={canvasId}
          nodes={nodes}
          rootNode={rootNode}
          checklistItemsByNode={checklistItemsByNode}
        />
      </div>
    </div>
  );
}
