import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/client';

export function useTasks(owner, due = 'all') {
  return useQuery({
    queryKey: ['tasks', owner, due],
    queryFn: () => tasksApi.getAll(owner, due),
    staleTime: 2 * 60 * 1000, // 2 minutes for tasks
    refetchInterval: 2 * 60 * 1000
  });
}

export function useOverdueTasks(owner) {
  return useQuery({
    queryKey: ['tasks', 'overdue', owner],
    queryFn: () => tasksApi.getOverdue(owner),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000
  });
}
