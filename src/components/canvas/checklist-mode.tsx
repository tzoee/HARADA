'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  Search, Filter, Map as MapIcon, Calendar, Ban, Circle, 
  Check, Loader2, ChevronRight, ChevronDown, CheckSquare
} from 'lucide-react';
import type { NodeWithProgress } from '@/types/computed';
import type { ChecklistItem } from '@/types/database';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checklist } from '@/components/checklist';
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
  onNodeUpdate,
}: ChecklistModeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [expandedSubGoals, setExpandedSubGoals] = useState<Set<string>>(new Set());

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

  // Filter activities based on search and filter
  const filteredActivities = useMemo(() => {
    let activities = allNodes.filter(n => n.level === 3);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      activities = activities.filter(a => 
        a.title.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (activeFilter) {
      case 'unfinished':
        activities = activities.filter(a => a.status !== 'done' && a.progress < 1);
        break;
      case 'blocked':
        activities = activities.filter(a => a.status === 'blocked' || a.inherited_blocked);
        break;
      case 'due-today':
        activities = activities.filter(a => {
          // Check activity due date
          if (a.due_date && isToday(parseISO(a.due_date))) return true;
          // Check checklist items due today
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

  const statusIcon = {
    done: <Check className="h-4 w-4 text-green-400" />,
    in_progress: <Loader2 className="h-4 w-4 text-blue-400" />,
    blocked: <Ban className="h-4 w-4 text-red-400" />,
  };

  const filterButtons: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Circle className="h-3.5 w-3.5" /> },
    { key: 'unfinished', label: 'Unfinished', icon: <Loader2 className="h-3.5 w-3.5" /> },
    { key: 'blocked', label: 'Blocked', icon: <Ban className="h-3.5 w-3.5" /> },
    { key: 'due-today', label: 'Due Today', icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="h-full flex bg-slate-950">
      {/* Left Panel - Activities List */}
      <div className="w-80 border-r border-slate-700/50 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="pl-9 bg-slate-800/50 border-slate-700 h-9"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="flex items-center gap-1 flex-wrap">
            {filterButtons.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                  "transition-colors duration-150",
                  activeFilter === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Activities grouped by Sub Goal */}
        <div className="flex-1 overflow-y-auto">
          {subGoals.map(subGoal => {
            const activities = groupedActivities[subGoal.id] || [];
            if (activities.length === 0 && activeFilter !== 'all') return null;
            
            const isExpanded = expandedSubGoals.has(subGoal.id);
            const allActivities = activitiesBySubGoal[subGoal.id] || [];

            return (
              <div key={subGoal.id} className="border-b border-slate-800/50">
                {/* Sub Goal Header */}
                <button
                  onClick={() => toggleSubGoal(subGoal.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5",
                    "hover:bg-slate-800/30 transition-colors",
                    subGoal.status === 'blocked' && "opacity-60"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {subGoal.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {activities.length}/{allActivities.length} activities
                    </p>
                  </div>
                  {subGoal.status === 'blocked' && (
                    <Ban className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${subGoal.progress * 100}%` }}
                    />
                  </div>
                </button>

                {/* Activities */}
                {isExpanded && (
                  <div className="pb-1">
                    {activities.length === 0 ? (
                      <p className="text-xs text-slate-600 px-8 py-2">
                        No matching activities
                      </p>
                    ) : (
                      activities.map(activity => (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivityId(activity.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 pl-8 py-2",
                            "hover:bg-slate-800/50 transition-colors",
                            selectedActivityId === activity.id && "bg-slate-800/70",
                            activity.inherited_blocked && "opacity-60"
                          )}
                        >
                          {statusIcon[activity.status] || <Circle className="h-4 w-4 text-slate-500" />}
                          <span className={cn(
                            "flex-1 text-sm text-left truncate",
                            activity.status === 'done' && "text-slate-500 line-through"
                          )}>
                            {activity.title}
                          </span>
                          {activity.inherited_blocked && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-red-400 border-red-400/30">
                              Blocked
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {Math.round(activity.progress * 100)}%
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Filter className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No activities match your filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Activity Details & Checklist */}
      <div className="flex-1 flex flex-col">
        {selectedActivity ? (
          <>
            {/* Activity Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Activity
                    </Badge>
                    {selectedActivity.inherited_blocked && (
                      <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                        🔒 Blocked
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-white truncate">
                    {selectedActivity.title}
                  </h2>
                  {selectedActivity.description && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {selectedActivity.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowOnMap(selectedActivity.id)}
                  className="flex-shrink-0"
                >
                  <MapIcon className="h-4 w-4 mr-1.5" />
                  Show on Map
                </Button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${selectedActivity.progress * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-300">
                  {Math.round(selectedActivity.progress * 100)}%
                </span>
              </div>
            </div>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto p-4">
              <Checklist 
                nodeId={selectedActivity.id}
                isReadOnly={selectedActivity.inherited_blocked}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <CheckSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Select an activity to view its checklist</p>
          </div>
        )}
      </div>
    </div>
  );
}
