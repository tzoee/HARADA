import { getCanvas } from '@/app/actions/canvas';
import { getTrees } from '@/app/actions/tree';
import { notFound } from 'next/navigation';
import { PlanTreeCard } from '@/components/plan-tree-card';
import { EmptyState } from '@/components/empty-state';
import { CreateTreeButton } from '@/components/create-tree-button';
import { Target } from 'lucide-react';

interface CanvasPageProps {
  params: Promise<{ canvasId: string }>;
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { canvasId } = await params;
  
  const [canvasResult, treesResult] = await Promise.all([
    getCanvas(canvasId),
    getTrees(canvasId),
  ]);

  if (canvasResult.error || !canvasResult.data) {
    notFound();
  }

  const canvas = canvasResult.data;
  const trees = treesResult.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{canvas.name}</h1>
          <p className="text-muted-foreground">
            {trees.length} {trees.length === 1 ? 'goal' : 'goals'}
          </p>
        </div>
        <CreateTreeButton canvasId={canvasId} />
      </div>

      {/* Trees Grid or Empty State */}
      {trees.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create your first main goal to start building your plan with the Harada method"
          action={<CreateTreeButton canvasId={canvasId} />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trees.map(tree => (
            <PlanTreeCard 
              key={tree.id} 
              tree={tree} 
              canvasId={canvasId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
