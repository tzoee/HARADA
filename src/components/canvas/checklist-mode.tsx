'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, Map as MapIcon, Calendar, Ban, Circle, 
  Check, Loader2, ChevronRight, ChevronDown, CheckSquare,
  ListFilter, X
} from 'lucide-react';
import type { NodeWithProgress } from '@/types/computed';
import type { ChecklistItem } from '@/types/database';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checklist } from '@/components/checklist';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isToday, parseISO } from 'date-fns';

type FilterType = 'all' | 'unfinished' | 'blocked' | 'due-today';

interface ChecklistModeProps {
  allNodes: NodeWithProgress[];
  checklistItemsByNode: globalThis.Map<string, ChecklistItem[]>;
  onShowOnMap: (nodeId: string) => void;
  onNodeUpdate?: () => void;
}

export function ChecklistMode({ 
  allNodes, 
  checklistItemsByNode,
  onShowOnMap,
}: ChecklistModeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [expandedSubGoals, setExpandedSubGoals] = useState<Set<string>>(new Set());

  // Auto-expand first sub goal with activities on mount
  useEffect(() => {
    const subGoals = allNodes.filter(n => n.level === 2);
    if (subGoals.length > 0 && expandedSubGoals.size === 0) {
      setExpandedSubGoals(new Set([subGoals[0].id]));
    }
  }, [allNodes, expandedSubGoals.size]);

  // Get Level 2 (Sub Goals) and Level 3 (Activities) nodes
  const { subGoals, activitiesBySubGoal } = useMemo(() => {
    const subGoals = allNodes.filter(n => n.level === 2);
    const activities = allNodes.filter(n => n.level === 3);
    
    const activitiesBySubGoal: Record<string, NodeWithProgress[]> = {};
    activities.forEach(activity => {
      if (activity.parent_id) {
        const existing = activitiesBySubGoal[activity.parent_id] || [];
        activitiesBySubGoal[activity.parent_id] = [...existing, activity];
      }
    });

    return { subGoals, activitiesBySubGoal };
  }, [allNodes]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let activities = allNodes.filter(n => n.level === 3);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      activities = activities.filter(a => a.title.toLowerCase().includes(query));
    }

    switch (activeFilter) {
      case 'unfinished':
        activities = activities.filter(a => a.status !== 'done' && a.progress < 1);
        break;
      case 'blocked':
        activities = activities.filter(a => a.status === 'blocked' || a.inherited_blocked);
        break;
      case 'due-today':
        activities = activities.filter(a => {
          if (a.due_date && isToday(parseISO(a.due_date))) return true;
          const items = checklistItemsByNode.get(a.id) || [];
          return items.some(item => item.due_date && isToday(parseISO(item.due_date)));
        });
        break;
    }

    return activities;
  }, [allNodes, searchQuery, activeFilter, checklistItemsByNode]);

  // Group filtered activities by sub goal
  const groupedActivities = useMemo(() => {
    const grouped: Record<string, NodeWithProgress[]> = {};
    filteredActivities.forEach(activity => {
      if (activity.parent_id) {
        const existing = grouped[activity.parent_id] || [];
        grouped[activity.parent_id] = [...existing, activity];
      }
    });
    return grouped;
  }, [filteredActivities]);

  const selectedActivity = useMemo(() => 
    selectedActivityId ? allNodes.find(n => n.id === selectedActivityId) : null,
    [selectedActivityId, allNodes]
  );

  const toggleSubGoal = useCallback((subGoalId: string) => {
    setExpandedSubGoals(prev => {
      const next = new Set(prev);
      if (next.has(subGoalId)) {
        next.delete(subGoalId);
      } else {
        next.add(subGoalId);
      }
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const filterLabels: Record<FilterType, string> = {
    'all': 'All Activities',
    'unfinished': 'Unfinished',
    'blocked': 'Blocked',
    'due-today': 'Due Today',
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left Panel - Clean Activity List */}
      <div className="w-72 border-r border-slate-800/60 flex flex-col bg-slate-950/50">
        {/* Header with Search & Filter */}
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-8 bg-slate-800/40 border-slate-700/50 h-9 text-sm focus:border-blue-500/50 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            )}
          </div>

          {/* Filter Dropdown - Cleaner than buttons */}
          <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
            <SelectTrigger className="h-8 bg-slate-800/40 border-slate-700/50 text-xs">
              <div className="flex items-center gap-2">
                <ListFilter className="h-3.5 w-3.5 text-slate-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="unfinished">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 text-blue-400" />
                  Unfinished
                </span>
              </SelectItem>
              <SelectItem value="blocked">
                <span className="flex items-center gap-2">
                  <Ban className="h-3 w-3 text-red-400" />
                  Blocked
                </span>
              </SelectItem>
              <SelectItem value="due-today">
                <span className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  Due Today
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity count */}
        <div className="px-4 pb-2">
          <p className="text-[11px] text-slate-500">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
            {activeFilter !== 'all' && ` · ${filterLabels[activeFilter]}`}
          </p>
        </div>

        {/* Activities List - Cleaner hierarchy */}
        <div className="flex-1 overflow-y-auto">
          {subGoals.map(subGoal => {
            const activities = groupedActivities[subGoal.id] || [];
            if (activities.length === 0 && activeFilter !== 'all') return null;
            
            const isExpanded = expandedSubGoals.has(subGoal.id);
            const allActivities = activitiesBySubGoal[subGoal.id] || [];
            const completedCount = allActivities.filter(a => a.status === 'done').length;

            return (
              <div key={subGoal.id}>
                {/* Sub Goal Header - Minimal */}
                <button
                  onClick={() => toggleSubGoal(subGoal.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3",
                    "hover:bg-slate-800/30 transition-all duration-150",
                    "border-b border-slate-800/30",
                    subGoal.status === 'blocked' && "opacity-50"
                  )}
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 text-slate-600 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm text-slate-300 truncate font-medium">
                      {subGoal.title}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-600 tabular-nums">
                    {completedCount}/{allActivities.length}
                  </span>
                </button>

                {/* Activities - Smooth expand */}
                <div className={cn(
                  "overflow-hidden transition-all duration-200",
                  isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-600 px-4 py-3 pl-10">
                      No activities
                    </p>
                  ) : (
                    activities.map(activity => {
                      const isSelected = selectedActivityId === activity.id;
                      const isDone = activity.status === 'done';
                      const isBlocked = activity.inherited_blocked || activity.status === 'blocked';
                      
                      return (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivityId(activity.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 pl-10",
                            "transition-all duration-150",
                            isSelected 
                              ? "bg-blue-600/20 border-l-2 border-blue-500" 
                              : "hover:bg-slate-800/40 border-l-2 border-transparent",
                            isBlocked && "opacity-50"
                          )}
                        >
                          {/* Status indicator */}
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                            isDone ? "bg-green-500/20" : isBlocked ? "bg-red-500/20" : "bg-slate-700/50"
                          )}>
                            {isDone ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : isBlocked ? (
                              <Ban className="h-3 w-3 text-red-400" />
                            ) : (
                              <Circle className="h-2 w-2 text-slate-500" />
                            )}
                          </div>
                          
                          <span className={cn(
                            "flex-1 text-sm text-left truncate",
                            isDone && "text-slate-500 line-through",
                            !isDone && "text-slate-300"
                          )}>
                            {activity.title}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <CheckSquare className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No activities found</p>
              {activeFilter !== 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="text-xs text-blue-400 mt-2 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Activity Details */}
      <div className="flex-1 flex flex-col">
        {selectedActivity ? (
          <ActivityDetail 
            activity={selectedActivity}
            onShowOnMap={onShowOnMap}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// Separated component for cleaner code
function ActivityDetail({ 
  activity, 
  onShowOnMap 
}: { 
  activity: NodeWithProgress; 
  onShowOnMap: (id: string) => void;
}) {
  const isBlocked = activity.inherited_blocked || activity.status === 'blocked';
  const progressPercent = Math.round(activity.progress * 100);

  return (
    <>
      {/* Header - Clean and spacious */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            {isBlocked && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs mb-3">
                <Ban className="h-3 w-3" />
                Blocked
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-white leading-tight">
              {activity.title}
            </h2>
            
            {activity.description && (
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {activity.description}
              </p>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowOnMap(activity.id)}
            className="flex-shrink-0 border-slate-700 hover:bg-slate-800"
          >
            <MapIcon className="h-4 w-4 mr-1.5" />
            View on Map
          </Button>
        </div>

        {/* Progress - Subtle */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPercent === 100 ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Checklist - Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Checklist 
          nodeId={activity.id}
          isReadOnly={isBlocked}
        />
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
        <CheckSquare className="h-8 w-8 opacity-50" />
      </div>
      <p className="text-sm font-medium text-slate-500">Select an activity</p>
      <p className="text-xs text-slate-600 mt-1">Choose from the list to view checklist</p>
    </div>
  );
}
