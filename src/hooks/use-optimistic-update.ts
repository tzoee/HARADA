'use client';

import { useState, useCallback, useTransition } from 'react';
import { useUIStore } from '@/store/ui-store';

interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
}

/**
 * Hook for optimistic updates with automatic rollback on error.
 * 
 * @param initialData - The initial data state
 * @param onError - Callback when an error occurs (for showing toast, etc.)
 * @returns Object with optimistic state and update function
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  onError?: (error: Error) => void
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
  });
  const [isPending, startTransition] = useTransition();

  const optimisticUpdate = useCallback(
    async (
      optimisticData: T,
      serverAction: () => Promise<{ error?: string | null }>
    ) => {
      // Store previous state for rollback
      const previousData = state.data;

      // Apply optimistic update immediately
      setState({
        data: optimisticData,
        isOptimistic: true,
      });

      try {
        // Execute server action
        const result = await serverAction();

        if (result.error) {
          // Rollback on server error
          setState({
            data: previousData,
            isOptimistic: false,
          });
          onError?.(new Error(result.error));
        } else {
          // Confirm optimistic update
          setState({
            data: optimisticData,
            isOptimistic: false,
          });
        }
      } catch (error) {
        // Rollback on network/unexpected error
        setState({
          data: previousData,
          isOptimistic: false,
        });
        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    },
    [state.data, onError]
  );

  const setData = useCallback((newData: T) => {
    setState({
      data: newData,
      isOptimistic: false,
    });
  }, []);

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    isPending,
    optimisticUpdate,
    setData,
  };
}

/**
 * Hook specifically for optimistic node status updates.
 */
export function useOptimisticNodeStatus(
  initialStatus: 'done' | 'in_progress' | 'blocked',
  nodeId: string,
  onUpdate: (nodeId: string, status: 'done' | 'in_progress' | 'blocked') => Promise<{ error?: string | null }>,
  onError?: (error: Error) => void
) {
  const { data: status, isOptimistic, optimisticUpdate, setData } = useOptimisticUpdate(
    initialStatus,
    onError
  );

  const updateStatus = useCallback(
    async (newStatus: 'done' | 'in_progress' | 'blocked') => {
      await optimisticUpdate(newStatus, () => onUpdate(nodeId, newStatus));
    },
    [nodeId, onUpdate, optimisticUpdate]
  );

  return {
    status,
    isOptimistic,
    updateStatus,
    setStatus: setData,
  };
}

/**
 * Hook for optimistic list operations (add, remove, update items).
 */
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  onError?: (error: Error) => void
) {
  const { data: items, isOptimistic, optimisticUpdate, setData } = useOptimisticUpdate(
    initialItems,
    onError
  );

  const addItem = useCallback(
    async (item: T, serverAction: () => Promise<{ error?: string | null }>) => {
      const newItems = [...items, item];
      await optimisticUpdate(newItems, serverAction);
    },
    [items, optimisticUpdate]
  );

  const removeItem = useCallback(
    async (itemId: string, serverAction: () => Promise<{ error?: string | null }>) => {
      const newItems = items.filter(item => item.id !== itemId);
      await optimisticUpdate(newItems, serverAction);
    },
    [items, optimisticUpdate]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<T>,
      serverAction: () => Promise<{ error?: string | null }>
    ) => {
      const newItems = items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      await optimisticUpdate(newItems, serverAction);
    },
    [items, optimisticUpdate]
  );

  return {
    items,
    isOptimistic,
    addItem,
    removeItem,
    updateItem,
    setItems: setData,
  };
}
