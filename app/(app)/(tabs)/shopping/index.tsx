import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useHouseholdStore } from '../../../../src/stores/householdStore';
import { HouseholdSwitcher } from '../../../../src/components/HouseholdSwitcher';
import { AvatarButton } from '../../../../src/components/AvatarButton';
import { COLORS, SPACING } from '../../../../src/constants';
import { ShoppingCategory, ShoppingItem } from '../../../../src/types';
import {
  subscribeCategories,
  subscribeItems,
  createCategory,
  deleteCategory,
  updateCategoryName,
  addItem,
  toggleItemBought,
  updateItemQuantity,
  deleteItem,
  getHistory,
} from '../../../../src/services/shopping';

const UNCATEGORIZED_ID = '__none__';

export default function ShoppingScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const household = useHouseholdStore((s) => s.household);
  const householdId = household?.id ?? null;

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Add bar state
  const [inputText, setInputText] = useState('');
  const [inputQty, setInputQty] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [loading, setLoading] = useState(false);

  // Category manager state
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<ShoppingCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');

  useEffect(() => {
    if (!householdId) return;
    const unsub1 = subscribeCategories(householdId, setCategories);
    const unsub2 = subscribeItems(householdId, setItems);
    getHistory(householdId).then(setHistory);
    return () => { unsub1(); unsub2(); };
  }, [householdId]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const q = inputText.trim().toLowerCase();
    if (q.length < 1) { setSuggestions([]); return; }
    const filtered = history
      .filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 5);
    setSuggestions(filtered);
  }, [inputText, history]);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAddItem() {
    const name = inputText.trim();
    if (!name || !householdId || !uid) return;
    setLoading(true);
    try {
      const catId = selectedCategoryId === UNCATEGORIZED_ID ? null : selectedCategoryId;
      await addItem(householdId, name, catId, uid, inputQty);
      setInputText('');
      setInputQty(1);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item: ShoppingItem) {
    await toggleItemBought(item);
  }

  async function handleDelete(item: ShoppingItem) {
    await deleteItem(item.id);
  }

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name || !householdId) return;
    await createCategory(householdId, name, categories.length);
    setNewCatName('');
  }

  async function handleDeleteCategory(cat: ShoppingCategory) {
    Alert.alert(
      t('shopping.deleteCategoryTitle'),
      t('shopping.deleteCategoryMessage', { name: cat.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteCategory(cat.id),
        },
      ]
    );
  }

  async function handleSaveEditCat() {
    if (!editingCat || !editCatName.trim()) return;
    await updateCategoryName(editingCat.id, editCatName);
    setEditingCat(null);
    setEditCatName('');
  }

  const selectedCatName = selectedCategoryId === UNCATEGORIZED_ID || !selectedCategoryId
    ? t('shopping.noCategory')
    : categories.find((c) => c.id === selectedCategoryId)?.name ?? t('shopping.noCategory');

  // Group items by category
  const itemsByCategory: Record<string, ShoppingItem[]> = {};
  items.forEach((item) => {
    const key = item.categoryId ?? UNCATEGORIZED_ID;
    if (!itemsByCategory[key]) itemsByCategory[key] = [];
    itemsByCategory[key].push(item);
  });

  // Sections: known categories in order, then uncategorized
  const sections: { id: string; name: string }[] = [
    ...categories.map((c) => ({ id: c.id, name: c.name })),
    { id: UNCATEGORIZED_ID, name: t('shopping.noCategory') },
  ].filter((s) => (itemsByCategory[s.id]?.length ?? 0) > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <HouseholdSwitcher />
        </View>
        <TouchableOpacity onPress={() => setShowCategoryManager(true)} style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>{t('shopping.manageCategories')}</Text>
        </TouchableOpacity>
        <AvatarButton />
      </View>

      {/* Item list */}
      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {sections.length === 0 && (
          <Text style={styles.emptyText}>{t('shopping.emptyList')}</Text>
        )}
        {sections.map((section) => {
          const sectionItems = itemsByCategory[section.id] ?? [];
          const isOpen = collapsed[section.id] !== true;
          return (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleCollapse(section.id)} activeOpacity={0.7}>
                <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
                <Text style={styles.sectionTitle}>{section.name}</Text>
                <Text style={styles.sectionCount}>({sectionItems.length})</Text>
              </TouchableOpacity>
              {isOpen && sectionItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggle(item)}
                  onDelete={() => handleDelete(item)}
                  onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
                  canDelete={item.createdBy === uid}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsBox, { bottom: 72 + keyboardHeight }]}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionItem}
              onPress={() => { setInputText(s); setSuggestions([]); }}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category picker dropdown — floats above the add bar */}
      {showCategoryPicker && (
        <>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowCategoryPicker(false)} />
          <View style={[styles.categoryDropdown, { bottom: 68 + keyboardHeight }]}>
            <TouchableOpacity
              style={styles.catOption}
              onPress={() => { setSelectedCategoryId(null); setShowCategoryPicker(false); }}
            >
              <Text style={[styles.catOptionText, !selectedCategoryId && styles.catOptionActive]}>
                {t('shopping.noCategory')}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catOption}
                onPress={() => { setSelectedCategoryId(cat.id); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.catOptionText, selectedCategoryId === cat.id && styles.catOptionActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Add bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.addBar}>
          <TouchableOpacity style={styles.categoryPill} onPress={() => setShowCategoryPicker((v) => !v)}>
            <Text style={styles.categoryPillText} numberOfLines={1}>{selectedCatName}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.addInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('shopping.addPlaceholder')}
            placeholderTextColor={COLORS.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
          />
          <QuantityStepper value={inputQty} onChange={setInputQty} />
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem} disabled={loading || !inputText.trim()}>
            {loading
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.addButtonText}>+</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category manager modal — centered dialog */}
      <Modal visible={showCategoryManager} transparent animationType="fade" onRequestClose={() => setShowCategoryManager(false)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowCategoryManager(false)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.manageCategories')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {categories.map((cat) => (
                <View key={cat.id} style={styles.catManagerRow}>
                  {editingCat?.id === cat.id ? (
                    <>
                      <TextInput
                        style={styles.catEditInput}
                        value={editCatName}
                        onChangeText={setEditCatName}
                        autoFocus
                        onSubmitEditing={handleSaveEditCat}
                      />
                      <TouchableOpacity onPress={handleSaveEditCat}>
                        <Text style={styles.catSaveText}>{t('common.save')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => { setEditingCat(cat); setEditCatName(cat.name); }} style={{ flex: 1 }}>
                        <Text style={styles.catManagerName}>{cat.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                        <Text style={styles.catDeleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              {/* New category input */}
              <View style={styles.newCatRow}>
                <TextInput
                  style={styles.catEditInput}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder={t('shopping.newCategoryPlaceholder')}
                  placeholderTextColor={COLORS.textSecondary}
                  onSubmitEditing={handleCreateCategory}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleCreateCategory} style={styles.newCatBtn}>
                  <Text style={styles.newCatBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

function ItemRow({
  item, onToggle, onDelete, onQuantityChange, canDelete,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  onQuantityChange: (qty: number) => void;
  canDelete: boolean;
}) {
  const locked = item.bought;
  return (
    <View style={[styles.itemRow, locked && styles.itemRowBought]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        {locked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[styles.itemName, locked && styles.itemNameBought]} numberOfLines={1}>
        {item.name}
      </Text>
      <QuantityStepper value={item.quantity ?? 1} onChange={onQuantityChange} disabled={locked} />
      {canDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuantityStepper({ value, onChange, disabled = false }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <View style={[styles.stepper, disabled && styles.stepperDisabled]}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onChange(value + 1)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  manageBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  manageBtnText: { fontSize: 13, color: COLORS.textSecondary },
  listContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 120 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: SPACING.xl, fontSize: 15 },
  section: { gap: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  chevron: { fontSize: 12, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  sectionCount: { fontSize: 12, color: COLORS.textSecondary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: 8, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md, marginBottom: 2,
  },
  itemRowBought: { opacity: 0.45 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkmark: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 15, color: COLORS.text },
  itemNameBought: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 20, color: COLORS.textSecondary, lineHeight: 22 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, overflow: 'hidden',
  },
  stepperDisabled: { opacity: 0.35 },
  stepBtn: {
    width: 26, height: 26, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  stepBtnText: { fontSize: 16, color: COLORS.primary, fontWeight: '600', lineHeight: 20 },
  stepValue: { minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '600', color: COLORS.text },
  suggestionsBox: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: 72,
    backgroundColor: COLORS.white, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
    zIndex: 10,
  },
  suggestionItem: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionText: { fontSize: 14, color: COLORS.text },
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  categoryPill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary,
    maxWidth: 100,
  },
  categoryPillText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  addInput: {
    flex: 1, fontSize: 15, color: COLORS.text,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: { color: COLORS.white, fontSize: 24, lineHeight: 28, fontWeight: '600' },
  categoryDropdown: {
    position: 'absolute', left: SPACING.md, bottom: 68,
    minWidth: 160,
    backgroundColor: COLORS.white, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  managerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: SPACING.md },
  managerDialog: {
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: SPACING.md, gap: SPACING.sm, maxHeight: '75%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  catOption: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catOptionText: { fontSize: 15, color: COLORS.text },
  catOptionActive: { color: COLORS.primary, fontWeight: '700' },
  catManagerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  catManagerName: { fontSize: 15, color: COLORS.text, flex: 1 },
  catDeleteText: { fontSize: 14, color: COLORS.danger },
  catSaveText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  catEditInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: 14, color: COLORS.text,
  },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  newCatBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  newCatBtnText: { color: COLORS.white, fontSize: 22, lineHeight: 26, fontWeight: '600' },
});
