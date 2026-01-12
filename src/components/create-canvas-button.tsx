'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createCanvas } from '@/app/actions/canvas';

export function CreateCanvasButton() {
  async function handleCreate() {
    await createCanvas();
  }

  return (
    <Button onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      Create Canvas
    </Button>
  );
}
