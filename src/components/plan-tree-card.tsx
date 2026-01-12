import Link from 'next/link';
import { Target } from 'lucide-react';
import type { PlanTree } from '@/types/database';
import { ProgressRing } from '@/components/progress-ring';

interface PlanTreeCardProps {
  tree: PlanTree;
  canvasId: string;
  progress?: number;
}

export function PlanTreeCard({ tree, canvasId, progress = 0 }: PlanTreeCardProps) {
  return (
    <Link
      href={`/app/canvas/${canvasId}/tree/${tree.id}`}
      className="glass-card rounded-lg p-6 hover:border-primary/50 transition-all pillar-glow group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <ProgressRing progress={progress} size={48} />
      </div>
      
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {tree.title}
      </h3>
      
      <p className="text-sm text-muted-foreground">
        {Math.round(progress * 100)}% complete
      </p>
    </Link>
  );
}
