import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useHouseholdStore } from '../../../../src/stores/householdStore';
import { HouseholdSwitcher } from '../../../../src/components/HouseholdSwitcher';
import { AvatarButton } from '../../../../src/components/AvatarButton';
import { Colors, SPACING } from '../../../../src/constants';
import { useTheme } from '../../../../src/hooks/useTheme';
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
  updateItemCategory,
  markItemNotBought,
} from '../../../../src/services/shopping';

const UNCATEGORIZED_ID = '__none__';
const BOUGHT_SECTION_ID = '__bought__';

type DragRefs = {
  startDragRef: React.RefObject<(item: ShoppingItem, fromSection: string, pageX: number, pageY: number) => void>;
  moveDragRef: React.RefObject<(pageX: number, pageY: number) => void>;
  endDragRef: React.RefObject<() => void>;
};

export default function ShoppingScreen() {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const household = useHouseholdStore((s) => s.household);
  const householdId = household?.id ?? null;
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [showAllBought, setShowAllBought] = useState(false);
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

  // DnD state
  const [draggingItem, setDraggingItem] = useState<ShoppingItem | null>(null);
  const [dropTargetSection, setDropTargetSection] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const ghostY = useRef(new Animated.Value(0)).current;

  // DnD mutable refs
  const draggingItemRef = useRef<ShoppingItem | null>(null);
  const draggingFromSectionRef = useRef<string | null>(null);
  const dropTargetSectionRef = useRef<string | null>(null);
  const scrollOffsetRef = useRef(0);
  const containerTopRef = useRef(0);
  const sectionLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const containerRef = useRef<View>(null);

  // DnD callback refs — updated every render so PanResponders always call the latest version
  const startDragRef = useRef<(item: ShoppingItem, fromSection: string, pageX: number, pageY: number) => void>(() => {});
  const moveDragRef = useRef<(pageX: number, pageY: number) => void>(() => {});
  const endDragRef = useRef<() => void>(() => {});

  startDragRef.current = (item, fromSection, _pageX, pageY) => {
    draggingItemRef.current = item;
    draggingFromSectionRef.current = fromSection;
    dropTargetSectionRef.current = null;
    ghostY.setValue(pageY - containerTopRef.current - 24);
    setDraggingItem(item);
    setDropTargetSection(null);
    setScrollEnabled(false);
  };

  moveDragRef.current = (_pageX, pageY) => {
    const relY = pageY - containerTopRef.current;
    ghostY.setValue(relY - 24);
    const contentY = relY + scrollOffsetRef.current;
    let newTarget: string | null = null;
    sectionLayoutsRef.current.forEach((layout, sectionId) => {
      if (contentY >= layout.y && contentY <= layout.y + layout.height) {
        newTarget = sectionId;
      }
    });
    if (newTarget !== dropTargetSectionRef.current) {
      dropTargetSectionRef.current = newTarget;
      setDropTargetSection(newTarget);
    }
  };

  endDragRef.current = () => {
    const item = draggingItemRef.current;
    const fromSection = draggingFromSectionRef.current;
    const toSection = dropTargetSectionRef.current;

    draggingItemRef.current = null;
    draggingFromSectionRef.current = null;
    dropTargetSectionRef.current = null;
    setDraggingItem(null);
    setDropTargetSection(null);
    setScrollEnabled(true);

    if (!item || !toSection || toSection === fromSection || toSection === BOUGHT_SECTION_ID) return;

    const catId = toSection === UNCATEGORIZED_ID ? null : toSection;
    if (fromSection === BOUGHT_SECTION_ID) {
      markItemNotBought(item.id, catId);
    } else {
      updateItemCategory(item.id, catId);
    }
  };

  const dragRefs: DragRefs = { startDragRef, moveDragRef, endDragRef };

  useEffect(() => {
    if (!householdId) return;
    const unsub1 = subscribeCategories(householdId, setCategories);
    const unsub2 = subscribeItems(householdId, setItems, showAllBought);
    getHistory(householdId).then(setHistory);
    return () => { unsub1(); unsub2(); };
  }, [householdId, showAllBought]);

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
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteCategory(cat.id) },
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
    : categories.find((cat) => cat.id === selectedCategoryId)?.name ?? t('shopping.noCategory');

  // Split items
  const { boughtItems, nonBoughtItems } = useMemo(() => {
    const bought: ShoppingItem[] = [];
    const nonBought: ShoppingItem[] = [];
    items.forEach((item) => {
      if (item.bought) bought.push(item);
      else nonBought.push(item);
    });
    return { boughtItems: bought, nonBoughtItems: nonBought };
  }, [items]);

  // Group non-bought items by category
  const nonBoughtByCategory = useMemo(() => {
    const map: Record<string, ShoppingItem[]> = {};
    nonBoughtItems.forEach((item) => {
      const key = item.categoryId ?? UNCATEGORIZED_ID;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [nonBoughtItems]);

  const sections: { id: string; name: string }[] = useMemo(() => {
    const regular = [
      ...categories.map((cat) => ({ id: cat.id, name: cat.name })),
      { id: UNCATEGORIZED_ID, name: t('shopping.noCategory') },
    ].filter((s) => (nonBoughtByCategory[s.id]?.length ?? 0) > 0);

    if (boughtItems.length > 0) {
      regular.push({ id: BOUGHT_SECTION_ID, name: t('shopping.bought') });
    }
    return regular;
  }, [categories, nonBoughtByCategory, boughtItems.length, t]);

  const isEmpty = sections.length === 0;

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

      {/* Content area with ghost overlay */}
      <View
        ref={containerRef}
        style={{ flex: 1 }}
        onLayout={() => {
          containerRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
            containerTopRef.current = pageY;
          });
        }}
      >
        <ScrollView
          scrollEnabled={scrollEnabled}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEmpty && (
            <Text style={styles.emptyText}>{t('shopping.emptyList')}</Text>
          )}
          {sections.map((section) => {
            const isBoughtSection = section.id === BOUGHT_SECTION_ID;
            const sectionItems = isBoughtSection
              ? boughtItems
              : (nonBoughtByCategory[section.id] ?? []);
            const isOpen = collapsed[section.id] !== true;
            const isDropTarget = dropTargetSection === section.id && section.id !== BOUGHT_SECTION_ID;

            return (
              <View
                key={section.id}
                style={styles.section}
                onLayout={(e) => {
                  sectionLayoutsRef.current.set(section.id, {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  });
                }}
              >
                <TouchableOpacity
                  style={[styles.sectionHeader, isDropTarget && styles.sectionHeaderDrop]}
                  onPress={() => toggleCollapse(section.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
                  <Text style={[styles.sectionTitle, isBoughtSection && styles.sectionTitleBought]}>
                    {section.name}
                  </Text>
                  <Text style={styles.sectionCount}>({sectionItems.length})</Text>
                  {isBoughtSection && (
                    <TouchableOpacity
                      onPress={() => setShowAllBought((v) => !v)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.showOlderBtn}>
                        {showAllBought ? t('shopping.hideOlderBought') : t('shopping.showOlderBought')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {isOpen && sectionItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    fromSection={section.id}
                    dragRefs={dragRefs}
                    isDragging={draggingItem?.id === item.id}
                    onToggle={() => toggleItemBought(item)}
                    onDelete={() => deleteItem(item.id)}
                    onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
                    canDelete={item.createdBy === uid}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>

        {/* DnD ghost overlay */}
        {draggingItem && (
          <Animated.View
            pointerEvents="none"
            style={[styles.ghost, { transform: [{ translateY: ghostY }] }]}
          >
            <Text style={styles.ghostText} numberOfLines={1}>{draggingItem.name}</Text>
          </Animated.View>
        )}
      </View>

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

      {/* Category picker dropdown */}
      {showCategoryPicker && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCategoryPicker(false)}
          />
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
            placeholderTextColor={c.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
          />
          <QuantityStepper value={inputQty} onChange={setInputQty} />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddItem}
            disabled={loading || !inputText.trim()}
          >
            {loading
              ? <ActivityIndicator color={c.white} size="small" />
              : <Text style={styles.addButtonText}>+</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category manager modal */}
      <Modal
        visible={showCategoryManager}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryManager(false)}
      >
        <TouchableOpacity
          style={styles.managerOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryManager(false)}
        >
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
                      <TouchableOpacity
                        onPress={() => { setEditingCat(cat); setEditCatName(cat.name); }}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.catManagerName}>{cat.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                        <Text style={styles.catDeleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              <View style={styles.newCatRow}>
                <TextInput
                  style={styles.catEditInput}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  placeholder={t('shopping.newCategoryPlaceholder')}
                  placeholderTextColor={c.textSecondary}
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
  item,
  fromSection,
  dragRefs,
  isDragging,
  onToggle,
  onDelete,
  onQuantityChange,
  canDelete,
}: {
  item: ShoppingItem;
  fromSection: string;
  dragRefs: DragRefs;
  isDragging: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onQuantityChange: (qty: number) => void;
  canDelete: boolean;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  // Keep fresh refs to avoid stale closures in the static PanResponder
  const itemRef = useRef(item);
  itemRef.current = item;
  const fromSectionRef = useRef(fromSection);
  fromSectionRef.current = fromSection;

  const isDragStarted = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragStarted.current = false;
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        if (!isDragStarted.current) {
          isDragStarted.current = true;
          dragRefs.startDragRef.current(itemRef.current, fromSectionRef.current, pageX, pageY);
          return;
        }
        dragRefs.moveDragRef.current(pageX, pageY);
      },
      onPanResponderRelease: () => {
        if (isDragStarted.current) {
          isDragStarted.current = false;
          dragRefs.endDragRef.current();
        }
      },
      onPanResponderTerminate: () => {
        if (isDragStarted.current) {
          isDragStarted.current = false;
          dragRefs.endDragRef.current();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.itemRow, item.bought && styles.itemRowBought, isDragging && styles.itemRowDragging]}>
      <View {...panResponder.panHandlers} style={styles.dragHandle} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Text style={styles.dragHandleText}>⠿</Text>
      </View>
      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        {item.bought && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[styles.itemName, item.bought && styles.itemNameBought]} numberOfLines={1}>
        {item.name}
      </Text>
      {!item.bought && (
        <QuantityStepper value={item.quantity ?? 1} onChange={onQuantityChange} />
      )}
      {canDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuantityStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  manageBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: c.border,
  },
  manageBtnText: { fontSize: 13, color: c.textSecondary },
  listContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 120 },
  emptyText: { textAlign: 'center', color: c.textSecondary, marginTop: SPACING.xl, fontSize: 15 },
  section: { gap: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderRadius: 8,
  },
  sectionHeaderDrop: {
    backgroundColor: c.primary + '20',
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  chevron: { fontSize: 12, color: c.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1 },
  sectionTitleBought: { color: c.textSecondary },
  sectionCount: { fontSize: 12, color: c.textSecondary },
  showOlderBtn: { fontSize: 12, color: c.primary, fontWeight: '500' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: c.card, borderRadius: 8, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md, marginBottom: 2,
  },
  itemRowBought: { opacity: 0.45 },
  itemRowDragging: { opacity: 0.25 },
  dragHandle: {
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleText: { fontSize: 16, color: c.textSecondary, lineHeight: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.primary,
    justifyContent: 'center', alignItems: 'center', backgroundColor: c.card,
  },
  checkmark: { color: c.primary, fontSize: 13, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 15, color: c.text },
  itemNameBought: { textDecorationLine: 'line-through', color: c.textSecondary },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 20, color: c.textSecondary, lineHeight: 22 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.border, borderRadius: 6, overflow: 'hidden',
  },
  stepperDisabled: { opacity: 0.35 },
  stepBtn: {
    width: 26, height: 26, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.background,
  },
  stepBtnText: { fontSize: 16, color: c.primary, fontWeight: '600', lineHeight: 20 },
  stepValue: { minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '600', color: c.text },
  ghost: {
    position: 'absolute',
    top: 0,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: c.card,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 50,
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: c.text },
  suggestionsBox: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: 72,
    backgroundColor: c.card, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
    zIndex: 10,
  },
  suggestionItem: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  suggestionText: { fontSize: 14, color: c.text },
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
  },
  categoryPill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: c.primary, maxWidth: 100,
  },
  categoryPillText: { fontSize: 12, color: c.primary, fontWeight: '600' },
  addInput: {
    flex: 1, fontSize: 15, color: c.text,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    backgroundColor: c.background, borderRadius: 8, borderWidth: 1, borderColor: c.border,
  },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: { color: c.white, fontSize: 24, lineHeight: 28, fontWeight: '600' },
  categoryDropdown: {
    position: 'absolute', left: SPACING.md, bottom: 68,
    minWidth: 160,
    backgroundColor: c.card, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
    zIndex: 20, overflow: 'hidden',
  },
  catOption: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  catOptionText: { fontSize: 15, color: c.text },
  catOptionActive: { color: c.primary, fontWeight: '700' },
  managerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', paddingHorizontal: SPACING.md,
  },
  managerDialog: {
    backgroundColor: c.card, borderRadius: 16,
    padding: SPACING.md, gap: SPACING.sm, maxHeight: '75%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: SPACING.xs },
  catManagerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  catManagerName: { fontSize: 15, color: c.text, flex: 1 },
  catDeleteText: { fontSize: 14, color: c.danger },
  catSaveText: { fontSize: 14, color: c.primary, fontWeight: '600' },
  catEditInput: {
    flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 8,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: 14, color: c.text,
  },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  newCatBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  newCatBtnText: { color: c.white, fontSize: 22, lineHeight: 26, fontWeight: '600' },
});
