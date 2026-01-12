'use client';

import { useState, useEffect } from 'react';
import { Bell, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { ReminderItem } from '@/types/computed';
import Link from 'next/link';

interface ReminderPanelProps {
  canvasId: string;
  reminders: ReminderItem[];
}

export function ReminderPanel({ canvasId, reminders }: ReminderPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort reminders by days until due
  const sortedReminders = [...reminders].sort((a, b) => a.days_until_due - b.days_until_due);
  
  // Count overdue and upcoming
  const overdueCount = reminders.filter(r => r.days_until_due < 0).length;
  const todayCount = reminders.filter(r => r.days_until_due === 0).length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {(overdueCount > 0 || todayCount > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {overdueCount + todayCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminders
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {sortedReminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No reminders set</p>
              <p className="text-sm mt-1">Enable reminders on your tasks to see them here</p>
            </div>
          ) : (
            sortedReminders.map((reminder) => (
              <ReminderCard
                key={reminder.node.id}
                reminder={reminder}
                canvasId={canvasId}
                onNavigate={() => setIsOpen(false)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ReminderCardProps {
  reminder: ReminderItem;
  canvasId: string;
  onNavigate: () => void;
}

function ReminderCard({ reminder, canvasId, onNavigate }: ReminderCardProps) {
  const { node, tree_title, days_until_due } = reminder;
  
  const getDueBadge = () => {
    if (days_until_due < 0) {
      return { label: `${Math.abs(days_until_due)}d overdue`, className: 'bg-red-500/20 text-red-400' };
    }
    if (days_until_due === 0) {
      return { label: 'Due today', className: 'bg-yellow-500/20 text-yellow-400' };
    }
    if (days_until_due === 1) {
      return { label: 'Due tomorrow', className: 'bg-blue-500/20 text-blue-400' };
    }
    return { label: `${days_until_due}d left`, className: 'bg-slate-500/20 text-slate-400' };
  };

  const badge = getDueBadge();

  return (
    <Link
      href={`/app/canvas/${canvasId}/tree/${reminder.tree_id}?node=${node.id}`}
      onClick={onNavigate}
      className={cn(
        "block p-3 rounded-lg",
        "bg-slate-800/50 border border-slate-700/50",
        "hover:bg-slate-700/50 hover:border-slate-600",
        "transition-colors"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {node.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {tree_title}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className={cn("text-[10px]", badge.className)}>
          <Calendar className="h-3 w-3 mr-1" />
          {badge.label}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          L{node.level}
        </Badge>
      </div>
    </Link>
  );
}

// Hook to fetch reminders for a canvas
export function useCanvasReminders(canvasId: string) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/reminders?canvasId=${canvasId}`);
        if (response.ok) {
          const data = await response.json();
          setReminders(data.reminders || []);
        }
      } catch (error) {
        console.error('Failed to fetch reminders:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReminders();
  }, [canvasId]);

  return { reminders, isLoading };
}
