import { useEffect, useState } from 'react';
import { subscribeTodos, subscribeAllTodos } from '../services/todos';
import { Todo } from '../types';

export function useTodos(householdId: string | null, uid: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId || !uid) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeTodos(householdId, uid, (data) => {
      setTodos(data);
      setLoading(false);
    });

    return unsub;
  }, [householdId, uid]);

  return { todos, loading };
}

export function useAllTodos(householdIds: string[], uid: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (householdIds.length === 0 || !uid) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeAllTodos(householdIds, uid, (data) => {
      setTodos(data);
      setLoading(false);
    });

    return unsub;
  }, [householdIds.join(','), uid]);

  return { todos, loading };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// True when a completed todo was finished within the last 24 hours.
export function isJustCompleted(todo: Todo): boolean {
  if (todo.status !== 'completed' || !todo.completedAt) return false;
  return todo.completedAt.toDate().getTime() >= Date.now() - ONE_DAY_MS;
}

// Returns todos grouped by assignedTo member uid (or 'unassigned').
// Default behaviour: show all pending todos (including future) + todos completed
// within the last 24 h ("just completed"). Older completed todos are hidden
// unless showAllCompleted is true.
export function useGroupedTodos(
  todos: Todo[],
  { showAllCompleted = false, onlyMine = false, uid = '' } = {}
) {
  const filtered = todos.filter((t) => {
    if (t.status === 'completed') {
      if (!isJustCompleted(t) && !showAllCompleted) return false;
    }
    if (onlyMine && !t.assignedTo.includes(uid)) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Todo[]>>((acc, todo) => {
    const keys = todo.assignedTo.length > 0 ? todo.assignedTo : ['unassigned'];
    keys.forEach((memberId) => {
      if (!acc[memberId]) acc[memberId] = [];
      acc[memberId].push(todo);
    });
    return acc;
  }, {});

  // Within each group: pending first (by dueDate asc), then completed (by completedAt desc)
  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      if (a.status === 'completed') {
        return (b.completedAt?.toDate().getTime() ?? 0) - (a.completedAt?.toDate().getTime() ?? 0);
      }
      return (a.dueDate?.toDate().getTime() ?? Infinity) - (b.dueDate?.toDate().getTime() ?? Infinity);
    });
  });

  return grouped;
}
