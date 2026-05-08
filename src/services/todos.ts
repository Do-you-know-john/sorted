import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Todo } from '../types';

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
};

export async function createTodo(input: CreateTodoInput): Promise<string> {
  const { description, dueDate, ...rest } = input;
  const ref = await addDoc(collection(db, 'todos'), {
    ...rest,
    ...(description ? { description } : {}),
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function completeTodo(todoId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'todos', todoId), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedBy: uid,
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
