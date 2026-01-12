import { getCanvases } from '@/app/actions/canvas';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { Plus } from 'lucide-react';
import { CreateCanvasButton } from '@/components/create-canvas-button';

export default async function AppPage() {
  const { data: canvases } = await getCanvases();

  // If user has canvases, redirect to the first one
  if (canvases && canvases.length > 0) {
    redirect(`/app/canvas/${canvases[0].id}`);
  }

  // Show empty state with create canvas prompt
  return (
    <div className="h-full flex items-center justify-center">
      <EmptyState
        icon={Plus}
        title="No canvases yet"
        description="Create your first canvas to start planning with the Harada method"
        action={<CreateCanvasButton />}
      />
    </div>
  );
}
