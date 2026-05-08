import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Todo, RecurrenceRule, TodoPriority } from '../types';

function getNextDueDate(rule: RecurrenceRule, from: Date): Date {
  const next = new Date(from);

  if (rule.type === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (rule.type === 'weekly') {
    const days = [...(rule.days ?? [])].sort((a, b) => a - b);
    if (days.length === 0) { next.setDate(next.getDate() + 7); return next; }
    const todayDay = from.getDay();
    const nextDay = days.find((d) => d > todayDay);
    if (nextDay !== undefined) {
      next.setDate(next.getDate() + (nextDay - todayDay));
    } else {
      next.setDate(next.getDate() + (7 - todayDay + days[0]));
    }
    return next;
  }

  if (rule.type === 'monthly') {
    const day = rule.dayOfMonth ?? 1;
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
  }

  return next;
}

export type CreateTodoInput = {
  householdId: string;
  title: string;
  description?: string;
  assignedTo: string[];
  visibleTo: string[];
  notifyOnComplete: string[];
  notifyOnOverdue: string[];
  dueDate: Date | null;
  createdBy: string;
  recurrence?: RecurrenceRule | null;
  priority?: TodoPriority;
};

export async function createTodo(input: CreateTodoInput): Promise<string> {
  const { description, dueDate, recurrence, priority, ...rest } = input;
  const ref = await addDoc(collection(db, 'todos'), {
    ...rest,
    ...(description ? { description } : {}),
    ...(recurrence ? { recurrence } : {}),
    ...(priority && priority !== 'normal' ? { priority } : {}),
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function completeTodo(todoId: string, uid: string): Promise<void> {
  const ref = doc(db, 'todos', todoId);
  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedBy: uid,
  });

  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const todo = { id: snap.id, ...snap.data() } as Todo;
  if (!todo.recurrence) return;

  const base = todo.dueDate?.toDate() ?? new Date();
  const from = base < new Date() ? new Date() : base;
  const nextDue = getNextDueDate(todo.recurrence, from);

  await addDoc(collection(db, 'todos'), {
    householdId: todo.householdId,
    title: todo.title,
    ...(todo.description ? { description: todo.description } : {}),
    assignedTo: todo.assignedTo,
    visibleTo: todo.visibleTo,
    notifyOnComplete: todo.notifyOnComplete,
    notifyOnOverdue: todo.notifyOnOverdue,
    createdBy: todo.createdBy,
    recurrence: todo.recurrence,
    dueDate: Timestamp.fromDate(nextDue),
    status: 'pending',
    completedAt: null,
    completedBy: null,
    createdAt: serverTimestamp(),
  });
}

export async function reopenTodo(todoId: string): Promise<void> {
  await updateDoc(doc(db, 'todos', todoId), {
    status: 'pending',
    completedAt: null,
    completedBy: null,
  });
}

export async function updateTodo(todoId: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, 'todos', todoId), updates);
}

export async function deleteTodo(todoId: string): Promise<void> {
  await deleteDoc(doc(db, 'todos', todoId));
}

// Subscribes to todos from multiple households simultaneously.
// Fires callback whenever any household's todos change.
export function subscribeAllTodos(
  householdIds: string[],
  uid: string,
  callback: (todos: Todo[]) => void
): () => void {
  if (householdIds.length === 0) {
    callback([]);
    return () => {};
  }

  const byHousehold: Record<string, Todo[]> = {};

  const unsubs = householdIds.map((householdId) => {
    byHousehold[householdId] = [];
    const q = query(collection(db, 'todos'), where('householdId', '==', householdId));

    return onSnapshot(q, (snap) => {
      const todos: Todo[] = [];
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Todo;
        if (data.visibleTo.length === 0 || data.visibleTo.includes(uid)) {
          todos.push(data);
        }
      });
      byHousehold[householdId] = todos;
      callback(Object.values(byHousehold).flat());
    });
  });

  return () => unsubs.forEach((u) => u());
}

// Returns unsubscribe function. Filters are applied client-side for visibility rules.
export function subscribeTodos(
  householdId: string,
  uid: string,
  callback: (todos: Todo[]) => void
): () => void {
  const q = query(
    collection(db, 'todos'),
    where('householdId', '==', householdId)
  );

  return onSnapshot(q, (snap) => {
    const todos: Todo[] = [];
    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() } as Todo;
      // Respect visibility: show if visibleTo is empty (all) or uid is included
      if (data.visibleTo.length === 0 || data.visibleTo.includes(uid)) {
        todos.push(data);
      }
    });
    callback(todos);
  });
}
