'use client';

import { useState, useEffect, useTransition, useCallback, KeyboardEvent } from 'react';
import { X, Check, Loader2, Ban, Calendar, ChevronRight, Plus, Trash2, CheckSquare } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import type { NodeWithProgress } from '@/types/computed';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateNode, expandNode, createChildNode, deleteNode } from '@/app/actions/node';
import { format } from 'date-fns';

interface MapDetailPanelProps {
  node: NodeWithProgress | null;
  childNodes?: NodeWithProgress[];
  onNodeUpdate?: () => void;
  onNavigateToChild?: (nodeId: string) => void;
  onOpenChecklist?: (nodeId: string) => void;
}

export function MapDetailPanel({ 
  node, 
  childNodes = [],
  onNodeUpdate,
  onNavigateToChild,
  onOpenChecklist,
}: MapDetailPanelProps) {
  const { detailPanelOpen, closeDetailPanel } = useUIStore();
  const [isPending, startTransition] = useTransition();
  
  // Local state for editing
  const [title, setTitle] = useState(node?.title || '');
  const [status, setStatus] = useState(node?.status || 'in_progress');

  // Handle Escape key to close panel
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      closeDetailPanel();
      e.preventDefault();
    }
  }, [closeDetailPanel]);

  // Sync local state when node changes
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setStatus(node.status);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = async (field: string, value: unknown) => {
    startTransition(async () => {
      await updateNode(node.id, { [field]: value });
      onNodeUpdate?.();
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as 'done' | 'in_progress' | 'blocked');
    await handleSave('status', newStatus);
  };

  const handleExpandChildren = async () => {
    if (node.level < 3 && !node.children_generated) {
      startTransition(async () => {
        await expandNode(node.id);
        onNodeUpdate?.();
      });
    }
  };

  const handleAddActivity = async () => {
    if (node.level === 2) {
      startTransition(async () => {
        await createChildNode(node.id);
        onNodeUpdate?.();
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    startTransition(async () => {
      await deleteNode(activityId);
      onNodeUpdate?.();
    });
  };

  const progressPercent = node ? Math.round(node.progress * 100) : 0;

  const statusIcon = {
    done: <Check className="h-4 w-4 text-green-400" />,
    in_progress: <Loader2 className="h-4 w-4 text-blue-400" />,
    blocked: <Ban className="h-4 w-4 text-red-400" />,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Node details: ${node.title}`}
      onKeyDown={handleKeyDown}
      className={cn(
        "fixed top-0 right-0 h-full w-80 max-w-full z-50",
        "bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50",
        "shadow-2xl shadow-black/50",
        "transform transition-transform duration-300 ease-out",
        "flex flex-col",
        detailPanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Level {node.level}
          </Badge>
          {node.inherited_blocked && (
            <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
              🔒
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={closeDetailPanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== node.title && handleSave('title', title)}
            className="bg-slate-800/50 border-slate-700 h-9"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Status</label>
          <Select 
            value={status} 
            onValueChange={handleStatusChange} 
            disabled={node.inherited_blocked}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="done">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Done
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-400" />
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="blocked">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-400" />
                  Blocked
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Progress</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-300 w-12 text-right">
              {progressPercent}%
            </span>
          </div>
          {node.progress_from_checklist && (
            <p className="text-[10px] text-slate-500">
              📋 From {node.checklist_count ?? 0} checklist items
            </p>
          )}
        </div>

        {/* Due Date (read-only display) */}
        {node.due_date && (
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Due Date</label>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Calendar className="h-4 w-4 text-slate-500" />
              {format(new Date(node.due_date), 'PPP')}
            </div>
          </div>
        )}

        {/* Children - For Level 1 and 2 */}
        {node.level < 3 && (
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">
                {node.level === 1 ? 'Sub Goals' : 'Activities'} ({childNodes.length})
              </label>
              {node.level === 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddActivity}
                  disabled={isPending}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              )}
              {!node.children_generated && node.level < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpandChildren}
                  disabled={isPending}
                  className="h-7 px-2 text-xs"
                >
                  Generate
                </Button>
              )}
            </div>
            
            {childNodes.length > 0 ? (
              <div className="space-y-1">
                {childNodes.map((child) => (
                  <div
                    key={child.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md",
                      "bg-slate-800/30 border border-slate-700/30",
                      "hover:bg-slate-800/50 transition-colors group"
                    )}
                  >
                    {statusIcon[child.status] || <Loader2 className="h-4 w-4 text-slate-500" />}
                    <button
                      onClick={() => onNavigateToChild?.(child.id)}
                      className="flex-1 text-left"
                    >
                      <span className="text-sm text-slate-200 truncate block">
                        {child.title}
                      </span>
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {Math.round(child.progress * 100)}%
                    </span>
                    {node.level === 2 && (
                      <button
                        onClick={() => handleDeleteActivity(child.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-950/50 rounded text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600 text-center py-3">
                No {node.level === 1 ? 'sub goals' : 'activities'} yet
              </p>
            )}
          </div>
        )}

        {/* Open in Checklist CTA - For Level 3 */}
        {node.level === 3 && (
          <div className="pt-4 border-t border-slate-700/50">
            <Button
              onClick={() => onOpenChecklist?.(node.id)}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Open in Checklist
            </Button>
            {(node.checklist_count ?? 0) > 0 && (
              <p className="text-[10px] text-slate-500 text-center mt-2">
                {node.checklist_count} checklist items
              </p>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
