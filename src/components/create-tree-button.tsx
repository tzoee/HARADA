'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createTree } from '@/app/actions/tree';

interface CreateTreeButtonProps {
  canvasId: string;
}

export function CreateTreeButton({ canvasId }: CreateTreeButtonProps) {
  async function handleCreate() {
    await createTree({ canvas_id: canvasId });
  }

  return (
    <Button onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      New Main Goal
    </Button>
  );
}
