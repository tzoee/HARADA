'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  Plus, 
  Archive, 
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  FolderOpen,
  Menu,
  X,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  createCanvas, 
  deleteCanvas, 
  archiveCanvas, 
  unarchiveCanvas,
  duplicateCanvas,
  updateCanvas 
} from '@/app/actions/canvas';
import { exportCanvas } from '@/app/actions/export';
import type { Canvas } from '@/types/database';
import { useUIStore } from '@/store/ui-store';

interface CanvasSidebarProps {
  canvases: Canvas[];
  userEmail: string;
}

export function CanvasSidebar({ canvases, userEmail }: CanvasSidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeCanvases = canvases.filter(c => !c.is_archived);
  const archivedCanvases = canvases.filter(c => c.is_archived);

  const currentCanvasId = pathname.match(/\/canvas\/([^/]+)/)?.[1];

  async function handleCreateCanvas() {
    await createCanvas();
  }

  async function handleRename(id: string, name: string) {
    if (name.trim()) {
      await updateCanvas(id, { name: name.trim() });
    }
    setEditingId(null);
  }

  async function handleDuplicate(id: string) {
    await duplicateCanvas(id);
  }

  async function handleArchive(id: string) {
    await archiveCanvas(id);
  }

  async function handleUnarchive(id: string) {
    await unarchiveCanvas(id);
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      await deleteCanvas(id);
    }
  }

  async function handleExport(id: string, name: string) {
    const result = await exportCanvas(id);
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  if (sidebarCollapsed) {
    return (
      <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-lg">Harada Pillars</h1>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* New Canvas Button */}
      <div className="p-3">
        <Button 
          onClick={handleCreateCanvas} 
          className="w-full justify-start"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Canvas
        </Button>
      </div>

      {/* Canvas List */}
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Canvases
          </h2>
          <div className="space-y-1">
            {activeCanvases.map(canvas => (
              <CanvasItem
                key={canvas.id}
                canvas={canvas}
                isActive={canvas.id === currentCanvasId}
                isEditing={editingId === canvas.id}
                editingName={editingName}
                onStartEdit={() => {
                  setEditingId(canvas.id);
                  setEditingName(canvas.name);
                }}
                onEditChange={setEditingName}
                onEditSubmit={() => handleRename(canvas.id, editingName)}
                onEditCancel={() => setEditingId(null)}
                onDuplicate={() => handleDuplicate(canvas.id)}
                onArchive={() => handleArchive(canvas.id)}
                onDelete={() => handleDelete(canvas.id)}
                onExport={() => handleExport(canvas.id, canvas.name)}
              />
            ))}
          </div>
        </div>

        {/* Archived Section */}
        {archivedCanvases.length > 0 && (
          <div className="px-3 py-2 border-t border-border mt-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground"
            >
              <ChevronDown className={cn(
                "h-3 w-3 mr-1 transition-transform",
                !showArchived && "-rotate-90"
              )} />
              Archived ({archivedCanvases.length})
            </button>
            {showArchived && (
              <div className="space-y-1">
                {archivedCanvases.map(canvas => (
                  <CanvasItem
                    key={canvas.id}
                    canvas={canvas}
                    isActive={canvas.id === currentCanvasId}
                    isEditing={false}
                    editingName=""
                    onStartEdit={() => {}}
                    onEditChange={() => {}}
                    onEditSubmit={() => {}}
                    onEditCancel={() => {}}
                    onDuplicate={() => handleDuplicate(canvas.id)}
                    onArchive={() => handleUnarchive(canvas.id)}
                    onDelete={() => handleDelete(canvas.id)}
                    onExport={() => handleExport(canvas.id, canvas.name)}
                    isArchived
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
      </div>
    </div>
  );
}

interface CanvasItemProps {
  canvas: Canvas;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onStartEdit: () => void;
  onEditChange: (name: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  isArchived?: boolean;
}

function CanvasItem({
  canvas,
  isActive,
  isEditing,
  editingName,
  onStartEdit,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onDuplicate,
  onArchive,
  onDelete,
  onExport,
  isArchived,
}: CanvasItemProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editingName}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSubmit();
            if (e.key === 'Escape') onEditCancel();
          }}
          onBlur={onEditSubmit}
          className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center">
      <Link
        href={`/app/canvas/${canvas.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-accent text-foreground"
        )}
      >
        <FolderOpen className="h-4 w-4 shrink-0" />
        <span className="truncate">{canvas.name}</span>
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isArchived && (
            <DropdownMenuItem onClick={onStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" />
            {isArchived ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
