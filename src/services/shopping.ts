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
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingCategory, ShoppingItem, ShoppingLabel, ShoppingTemplate, ShoppingTemplateItem } from '../types';

export const LABEL_COLORS = [
  '#4F46E5',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#6B7280',
];

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

// ── Labels ───────────────────────────────────────────────────────────────────

export function subscribeLabels(
  householdId: string,
  callback: (labels: ShoppingLabel[]) => void
): () => void {
  const q = query(
    collection(db, 'shoppingLabels'),
    where('householdId', '==', householdId)
  );
  return onSnapshot(q, (snap) => {
    const labels: ShoppingLabel[] = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ShoppingLabel))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    callback(labels);
  });
}

export async function createLabel(
  householdId: string,
  name: string,
  color: string,
  sortOrder: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'shoppingLabels'), {
    householdId,
    name: name.trim(),
    color,
    sortOrder,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteLabel(labelId: string): Promise<void> {
  await deleteDoc(doc(db, 'shoppingLabels', labelId));
}

export async function updateLabelName(labelId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'shoppingLabels', labelId), { name: name.trim() });
}

export async function updateItemLabel(itemId: string, labelId: string | null): Promise<void> {
  await updateDoc(doc(db, 'shoppingItems', itemId), { labelId });
}

export async function updateItemLabelSortOrders(
  updates: { id: string; labelSortOrder: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  updates.forEach(({ id, labelSortOrder }) => {
    batch.update(doc(db, 'shoppingItems', id), { labelSortOrder });
  });
  await batch.commit();
}

export async function createPresetLabels(householdId: string): Promise<void> {
  const presets = [
    { name: 'Aldi', color: '#4F46E5' },
    { name: 'Rewe', color: '#EF4444' },
    { name: 'Lidl', color: '#3B82F6' },
    { name: 'Kaufland', color: '#EC4899' },
    { name: 'Edeka', color: '#F59E0B' },
  ];
  const batch = writeBatch(db);
  presets.forEach((preset, index) => {
    const ref = doc(collection(db, 'shoppingLabels'));
    batch.set(ref, {
      householdId,
      name: preset.name,
      color: preset.color,
      sortOrder: index,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ── Items ────────────────────────────────────────────────────────────────────

export function subscribeItems(
  householdId: string,
  callback: (items: ShoppingItem[]) => void,
  includeOldBought = false,
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
      if (item.bought && item.boughtAt && !includeOldBought) {
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

export async function updateItemCategory(itemId: string, categoryId: string | null): Promise<void> {
  await updateDoc(doc(db, 'shoppingItems', itemId), { categoryId });
}

export async function markItemNotBought(
  itemId: string,
  categoryId: string | null,
  labelId?: string | null
): Promise<void> {
  const update: Record<string, unknown> = { bought: false, boughtAt: null, categoryId };
  if (labelId !== undefined) {
    update.labelId = labelId;
  }
  await updateDoc(doc(db, 'shoppingItems', itemId), update);
}

export async function addItem(
  householdId: string,
  name: string,
  categoryId: string | null,
  createdBy: string,
  quantity: number = 1,
  labelId?: string | null
): Promise<string> {
  const itemData: Record<string, unknown> = {
    householdId,
    name: name.trim(),
    quantity: Math.max(1, quantity),
    categoryId,
    bought: false,
    boughtAt: null,
    createdBy,
    createdAt: serverTimestamp(),
  };
  if (labelId !== undefined) {
    itemData.labelId = labelId;
  }
  const ref = await addDoc(collection(db, 'shoppingItems'), itemData);
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

// ── Templates ─────────────────────────────────────────────────────────────────

export function subscribeTemplates(
  householdId: string,
  callback: (templates: ShoppingTemplate[]) => void
): () => void {
  const q = query(
    collection(db, 'shoppingTemplates'),
    where('householdId', '==', householdId)
  );
  return onSnapshot(q, (snap) => {
    const templates = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ShoppingTemplate))
      .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
    callback(templates);
  });
}

export async function createTemplate(
  householdId: string,
  name: string,
  createdBy: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'shoppingTemplates'), {
    householdId,
    name: name.trim(),
    createdBy,
    items: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, 'shoppingTemplates', templateId));
}

export async function renameTemplate(templateId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'shoppingTemplates', templateId), { name: name.trim() });
}

export async function updateTemplateItems(
  templateId: string,
  items: ShoppingTemplateItem[]
): Promise<void> {
  await updateDoc(doc(db, 'shoppingTemplates', templateId), { items });
}

export async function applyTemplate(
  template: ShoppingTemplate,
  householdId: string,
  categoryId: string | null,
  createdBy: string,
  existingItems: ShoppingItem[]
): Promise<void> {
  if (template.items.length === 0) return;
  const batch = writeBatch(db);
  const names: string[] = [];

  for (const tmplItem of template.items) {
    const labelId = tmplItem.labelId ?? null;

    // Check for an existing non-bought item with same name + label + category → merge quantities
    const existing = existingItems.find(
      (i) =>
        !i.bought &&
        i.name.toLowerCase() === tmplItem.name.toLowerCase() &&
        (i.labelId ?? null) === labelId &&
        (i.categoryId ?? null) === categoryId
    );

    if (existing) {
      batch.update(doc(db, 'shoppingItems', existing.id), {
        quantity: existing.quantity + Math.max(1, tmplItem.quantity),
      });
    } else {
      const itemData: Record<string, unknown> = {
        householdId,
        name: tmplItem.name,
        quantity: Math.max(1, tmplItem.quantity),
        categoryId,
        bought: false,
        boughtAt: null,
        createdBy,
        createdAt: serverTimestamp(),
      };
      if (labelId !== null) itemData.labelId = labelId;
      batch.set(doc(collection(db, 'shoppingItems')), itemData);
    }
    names.push(tmplItem.name);
  }

  batch.set(
    doc(db, 'shoppingHistory', householdId),
    { names: arrayUnion(...names) },
    { merge: true }
  );

  await batch.commit();
}
