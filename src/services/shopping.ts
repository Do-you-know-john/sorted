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
  getDoc,
  setDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingCategory, ShoppingItem } from '../types';

// ── Categories ──────────────────────────────────────────────────────────────

export function subscribeCategories(
  householdId: string,
  callback: (cats: ShoppingCategory[]) => void
): () => void {
  const q = query(
    collection(db, 'shoppingCategories'),
    where('householdId', '==', householdId)
  );
  return onSnapshot(q, (snap) => {
    const cats: ShoppingCategory[] = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ShoppingCategory))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    callback(cats);
  });
}

export async function createCategory(householdId: string, name: string, sortOrder: number): Promise<string> {
  const ref = await addDoc(collection(db, 'shoppingCategories'), {
    householdId,
    name: name.trim(),
    sortOrder,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'shoppingCategories', categoryId));
  // Items in this category become uncategorized (categoryId stays, category doc gone)
}

export async function updateCategoryName(categoryId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'shoppingCategories', categoryId), { name: name.trim() });
}

// ── Items ────────────────────────────────────────────────────────────────────

export function subscribeItems(
  householdId: string,
  callback: (items: ShoppingItem[]) => void
): () => void {
  const q = query(
    collection(db, 'shoppingItems'),
    where('householdId', '==', householdId)
  );
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const items: ShoppingItem[] = [];
    snap.docs.forEach((d) => {
      const item = { id: d.id, ...d.data() } as ShoppingItem;
      if (item.bought && item.boughtAt) {
        if (now - item.boughtAt.toMillis() > 24 * 60 * 60 * 1000) return;
      }
      items.push(item);
    });
    items.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0;
      const tb = b.createdAt?.toMillis() ?? 0;
      return ta - tb;
    });
    callback(items);
  });
}

export async function addItem(
  householdId: string,
  name: string,
  categoryId: string | null,
  createdBy: string,
  quantity: number = 1
): Promise<string> {
  const ref = await addDoc(collection(db, 'shoppingItems'), {
    householdId,
    name: name.trim(),
    quantity: Math.max(1, quantity),
    categoryId,
    bought: false,
    boughtAt: null,
    createdBy,
    createdAt: serverTimestamp(),
  });
  // Persist to autocomplete history
  await recordHistory(householdId, name.trim());
  return ref.id;
}

export async function toggleItemBought(item: ShoppingItem): Promise<void> {
  await updateDoc(doc(db, 'shoppingItems', item.id), {
    bought: !item.bought,
    boughtAt: !item.bought ? serverTimestamp() : null,
  });
}

export async function updateItemQuantity(itemId: string, quantity: number): Promise<void> {
  await updateDoc(doc(db, 'shoppingItems', itemId), { quantity: Math.max(1, quantity) });
}

export async function deleteItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'shoppingItems', itemId));
}

// ── Autocomplete history ────────────────────────────────────────────────────

async function recordHistory(householdId: string, name: string): Promise<void> {
  const ref = doc(db, 'shoppingHistory', householdId);
  await setDoc(ref, { names: arrayUnion(name) }, { merge: true });
}

export async function getHistory(householdId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'shoppingHistory', householdId));
  if (!snap.exists()) return [];
  return (snap.data().names as string[]) ?? [];
}
