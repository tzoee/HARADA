'use client';

import { useState, useEffect, useTransition, useCallback, KeyboardEvent } from 'react';
import { X, Check, Loader2, Ban, Calendar, Bell, ChevronRight, Copy } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import type { NodeWithProgress } from '@/types/computed';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { updateNode, expandNode, duplicateSubtree } from '@/app/actions/node';
import { format } from 'date-fns';

interface NodeDetailPanelProps {
  node: NodeWithProgress | null;
  children?: NodeWithProgress[];
  onNodeUpdate?: () => void;
  onNavigateToChild?: (nodeId: string) => void;
}

export function NodeDetailPanel({ 
  node, 
  children = [],
  onNodeUpdate,
  onNavigateToChild,
}: NodeDetailPanelProps) {
  const { detailPanelOpen, closeDetailPanel } = useUIStore();
  const [isPending, startTransition] = useTransition();
  
  // Local state for editing
  const [title, setTitle] = useState(node?.title || '');
  const [description, setDescription] = useState(node?.description || '');
  const [status, setStatus] = useState(node?.status || 'in_progress');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    node?.due_date ? new Date(node.due_date) : undefined
  );
  const [reminderEnabled, setReminderEnabled] = useState(node?.reminder_enabled || false);
  const [reminderTime, setReminderTime] = useState(node?.reminder_time || '09:00');

  // Sync local state when node changes
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description || '');
      setStatus(node.status);
      setDueDate(node.due_date ? new Date(node.due_date) : undefined);
      setReminderEnabled(node.reminder_enabled);
      setReminderTime(node.reminder_time || '09:00');
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
    if (node.level < 7 && !node.children_generated) {
      startTransition(async () => {
        await expandNode(node.id);
        onNodeUpdate?.();
      });
    }
  };

  const handleDuplicateSubtree = async () => {
    startTransition(async () => {
      const result = await duplicateSubtree(node.id, node.parent_id);
      if (!result.error) {
        onNodeUpdate?.();
      }
    });
  };

  // Handle Escape key to close panel
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      closeDetailPanel();
      e.preventDefault();
    }
  }, [closeDetailPanel]);

  const progressPercent = Math.round(node.progress * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Node details: ${node.title}`}
      aria-describedby="node-detail-description"
      onKeyDown={handleKeyDown}
      className={cn(
        "fixed top-0 right-0 h-full w-96 max-w-full z-50",
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
          <Badge variant="outline" className="text-xs" aria-label={`Level ${node.level}`}>
            Level {node.level}
          </Badge>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {progressPercent}% complete
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={closeDetailPanel}
          aria-label="Close panel"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Hidden description for screen readers */}
      <div id="node-detail-description" className="sr-only">
        Edit details for {node.title}. Level {node.level} node with {progressPercent}% progress.
        {node.inherited_blocked && ' This node is blocked by a Level 2 ancestor.'}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== node.title && handleSave('title', title)}
            className="bg-slate-800/50 border-slate-700"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (node.description || '') && handleSave('description', description || null)}
            placeholder="Add a description..."
            className="bg-slate-800/50 border-slate-700 min-h-[100px] resize-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={status} 
            onValueChange={handleStatusChange} 
            disabled={node.inherited_blocked}
            aria-describedby={node.inherited_blocked ? 'status-blocked-message' : undefined}
          >
            <SelectTrigger 
              id="status"
              className="bg-slate-800/50 border-slate-700"
              aria-label={`Status: ${status}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="done">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                  Done
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="blocked">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-400" aria-hidden="true" />
                  Blocked
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {node.inherited_blocked && (
            <p id="status-blocked-message" className="text-xs text-red-400" role="alert">
              This node is blocked by a Level 2 ancestor
            </p>
          )}
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="due-date">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="due-date"
                variant="outline"
                aria-label={dueDate ? `Due date: ${format(dueDate, 'PPP')}` : 'Pick a due date'}
                className={cn(
                  "w-full justify-start text-left font-normal bg-slate-800/50 border-slate-700",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  handleSave('due_date', date ? format(date, 'yyyy-MM-dd') : null);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Reminder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder" className="flex items-center gap-2">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Reminder
            </Label>
            <Switch
              id="reminder"
              checked={reminderEnabled}
              onCheckedChange={(checked) => {
                setReminderEnabled(checked);
                handleSave('reminder_enabled', checked);
              }}
              aria-describedby="reminder-description"
            />
          </div>
          <span id="reminder-description" className="sr-only">
            Enable or disable reminder notifications for this task
          </span>
          {reminderEnabled && (
            <Input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              onBlur={() => handleSave('reminder_time', reminderTime)}
              className="bg-slate-800/50 border-slate-700"
              aria-label="Reminder time"
            />
          )}
        </div>

        {/* Children Grid */}
        {node.level < 7 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Children ({children.length}/8)</Label>
              {!node.children_generated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandChildren}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Generate Children'
                  )}
                </Button>
              )}
            </div>
            
            {children.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onNavigateToChild?.(child.id)}
                    className={cn(
                      "p-2 rounded-md text-left",
                      "bg-slate-800/50 border border-slate-700/50",
                      "hover:bg-slate-700/50 hover:border-slate-600",
                      "transition-colors"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate flex-1">
                        {child.title}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${child.progress * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(child.progress * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No children generated yet
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2 pt-4 border-t border-slate-700/50">
          <Label id="quick-actions-label">Quick Actions</Label>
          <div className="flex gap-2" role="group" aria-labelledby="quick-actions-label">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleStatusChange('done')}
              disabled={node.inherited_blocked || status === 'done'}
              aria-label="Mark task as done"
            >
              <Check className="h-4 w-4 mr-1" aria-hidden="true" />
              Mark Done
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleStatusChange('blocked')}
              disabled={node.inherited_blocked || status === 'blocked'}
              aria-label="Set task as blocked"
            >
              <Ban className="h-4 w-4 mr-1" aria-hidden="true" />
              Set Blocked
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDuplicateSubtree}
            disabled={isPending}
            aria-label="Duplicate this subtree"
          >
            <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
            Duplicate Subtree
          </Button>
        </div>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div 
          className="absolute inset-0 bg-slate-900/50 flex items-center justify-center"
          role="status"
          aria-label="Saving changes"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Saving changes...</span>
        </div>
      )}
    </div>
  );
}
