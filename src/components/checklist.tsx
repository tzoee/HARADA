'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { 
  Plus, Trash2, GripVertical, Check, Loader2, Ban, Circle,
  Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import type { ChecklistItem, ChecklistStatus } from '@/types/database';
import {
  getChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from '@/app/actions/checklist';
import { format } from 'date-fns';

interface ChecklistProps {
  nodeId: string;
  isReadOnly?: boolean;
}

export function Checklist({ nodeId, isReadOnly = false }: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Load checklist items
  useEffect(() => {
    const loadItems = async () => {
      const result = await getChecklistItems(nodeId);
      if (result.data) {
        setItems(result.data);
      }
    };
    loadItems();
  }, [nodeId]);

  const handleAddItem = useCallback(() => {
    if (isReadOnly) return;
    startTransition(async () => {
      const result = await createChecklistItem(nodeId);
      if (result.data) {
        setItems(prev => [...prev, result.data!]);
      }
    });
  }, [nodeId, isReadOnly]);

  const handleUpdateItem = useCallback((
    itemId: string,
    updates: Partial<Pick<ChecklistItem, 'title' | 'status' | 'notes' | 'due_date'>>
  ) => {
    if (isReadOnly) return;
    
    // Optimistic update
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));

    startTransition(async () => {
      const result = await updateChecklistItem(itemId, updates);
      if (result.error) {
        // Revert on error - reload items
        const reloadResult = await getChecklistItems(nodeId);
        if (reloadResult.data) {
          setItems(reloadResult.data);
        }
      }
    });
  }, [nodeId, isReadOnly]);

  const handleDeleteItem = useCallback((itemId: string) => {
    if (isReadOnly) return;
    
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== itemId));

    startTransition(async () => {
      const result = await deleteChecklistItem(itemId);
      if (result.error) {
        // Revert on error - reload items
        const reloadResult = await getChecklistItems(nodeId);
        if (reloadResult.data) {
          setItems(reloadResult.data);
        }
      }
    });
  }, [nodeId, isReadOnly]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    if (isReadOnly) return;
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId || isReadOnly) return;

    const draggedIndex = items.findIndex(i => i.id === draggedItemId);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder items
    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    setItems(newItems);
  };

  const handleDragEnd = () => {
    if (draggedItemId && !isReadOnly) {
      // Save new order to backend
      const itemIds = items.map(i => i.id);
      startTransition(async () => {
        await reorderChecklistItems(nodeId, itemIds);
      });
    }
    setDraggedItemId(null);
  };

  const statusIcon = {
    todo: <Circle className="h-4 w-4 text-slate-400" />,
    in_progress: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
    done: <Check className="h-4 w-4 text-green-400" />,
    blocked: <Ban className="h-4 w-4 text-red-400" />,
  };

  const statusColors = {
    todo: 'text-slate-400',
    in_progress: 'text-blue-400',
    done: 'text-green-400',
    blocked: 'text-red-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">
          Checklist ({items.length})
        </span>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddItem}
            disabled={isPending}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {/* Read-only warning */}
      {isReadOnly && (
        <div className="text-[11px] text-amber-400/80 bg-amber-950/30 px-2.5 py-1.5 rounded-md border border-amber-900/30">
          🔒 Unblock the parent goal to edit checklist.
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No checklist items yet
          </p>
        ) : (
          items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              isReadOnly={isReadOnly}
              isExpanded={expandedItemId === item.id}
              isDragging={draggedItemId === item.id}
              statusIcon={statusIcon[item.status]}
              statusColors={statusColors}
              onToggleExpand={() => setExpandedItemId(
                expandedItemId === item.id ? null : item.id
              )}
              onUpdate={(updates) => handleUpdateItem(item.id, updates)}
              onDelete={() => handleDeleteItem(item.id)}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  isReadOnly: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  statusIcon: React.ReactNode;
  statusColors: Record<ChecklistStatus, string>;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Pick<ChecklistItem, 'title' | 'status' | 'notes' | 'due_date'>>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function ChecklistItemRow({
  item,
  isReadOnly,
  isExpanded,
  isDragging,
  statusIcon,
  statusColors,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ChecklistItemRowProps) {
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localNotes, setLocalNotes] = useState(item.notes || '');

  // Sync local state when item changes
  useEffect(() => {
    setLocalTitle(item.title);
    setLocalNotes(item.notes || '');
  }, [item.title, item.notes]);

  const isBlocked = item.status === 'blocked';

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-md border transition-all duration-150",
        isDragging 
          ? "opacity-50 border-blue-500/50 bg-blue-950/20" 
          : "border-slate-700/50 bg-slate-800/30",
        isBlocked && "opacity-60"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 p-2">
        {/* Drag handle */}
        {!isReadOnly && (
          <GripVertical 
            className="h-4 w-4 text-slate-600 cursor-grab flex-shrink-0" 
          />
        )}

        {/* Status icon / quick toggle */}
        <button
          onClick={() => {
            if (isReadOnly) return;
            const nextStatus: Record<ChecklistStatus, ChecklistStatus> = {
              todo: 'in_progress',
              in_progress: 'done',
              done: 'todo',
              blocked: 'todo',
            };
            onUpdate({ status: nextStatus[item.status] });
          }}
          disabled={isReadOnly}
          className="flex-shrink-0 hover:scale-110 transition-transform disabled:cursor-not-allowed"
        >
          {statusIcon}
        </button>

        {/* Title - inline editable */}
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={() => {
            if (localTitle !== item.title) {
              onUpdate({ title: localTitle });
            }
          }}
          disabled={isReadOnly}
          className={cn(
            "flex-1 h-7 text-xs bg-transparent border-none px-1",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            isBlocked && "line-through text-slate-500"
          )}
        />

        {/* Due date indicator */}
        {item.due_date && (
          <span className="text-[10px] text-slate-500 flex-shrink-0">
            {format(new Date(item.due_date), 'MMM d')}
          </span>
        )}

        {/* Expand/collapse */}
        <button
          onClick={onToggleExpand}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          )}
        </button>

        {/* Delete */}
        {!isReadOnly && (
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-950/50 rounded transition-colors text-slate-500 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-700/30">
          {/* Status dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-12">Status</span>
            <Select
              value={item.status}
              onValueChange={(value) => onUpdate({ status: value as ChecklistStatus })}
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-7 text-xs bg-slate-800/50 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">
                  <span className={statusColors.todo}>To Do</span>
                </SelectItem>
                <SelectItem value="in_progress">
                  <span className={statusColors.in_progress}>In Progress</span>
                </SelectItem>
                <SelectItem value="done">
                  <span className={statusColors.done}>Done</span>
                </SelectItem>
                <SelectItem value="blocked">
                  <span className={statusColors.blocked}>Blocked</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-12">Due</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isReadOnly}
                  className={cn(
                    "h-7 text-xs justify-start bg-slate-800/50 border-slate-700",
                    !item.due_date && "text-slate-500"
                  )}
                >
                  <Calendar className="h-3 w-3 mr-1.5" />
                  {item.due_date ? format(new Date(item.due_date), 'PPP') : 'Set date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={item.due_date ? new Date(item.due_date) : undefined}
                  onSelect={(date) => {
                    onUpdate({ due_date: date ? format(date, 'yyyy-MM-dd') : null });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {item.due_date && !isReadOnly && (
              <button
                onClick={() => onUpdate({ due_date: null })}
                className="text-[10px] text-slate-500 hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500">Notes</span>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => {
                if (localNotes !== (item.notes || '')) {
                  onUpdate({ notes: localNotes || null });
                }
              }}
              disabled={isReadOnly}
              placeholder="Add notes..."
              className="min-h-[60px] text-xs bg-slate-800/50 border-slate-700 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
