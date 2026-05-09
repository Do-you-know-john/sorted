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
import { ShoppingCategory, ShoppingItem, ShoppingLabel, ShoppingTemplate, ShoppingTemplateItem } from '../../../../src/types';
import {
  subscribeCategories,
  subscribeLabels,
  subscribeItems,
  subscribeTemplates,
  createCategory,
  deleteCategory,
  updateCategoryName,
  updateItemCategory,
  createLabel,
  deleteLabel,
  updateLabelName,
  addItem,
  toggleItemBought,
  updateItemQuantity,
  deleteItem,
  getHistory,
  updateItemLabel,
  markItemNotBought,
  updateItemLabelSortOrders,
  createPresetLabels,
  createTemplate,
  deleteTemplate,
  renameTemplate,
  updateTemplateItems,
  applyTemplate,
  LABEL_COLORS,
} from '../../../../src/services/shopping';

// Section ID encodes both category and label group: `${catId}:::${labelId | NO_LABEL_KEY}`
const NO_CATEGORY_KEY = '__nocat__';
const NO_LABEL_KEY = '__nolabel__';
const BOUGHT_SECTION_ID = '__bought__';

function makeSectionId(categoryId: string, labelId: string | null): string {
  return `${categoryId}:::${labelId ?? NO_LABEL_KEY}`;
}

function parseSectionId(sectionId: string): { catKey: string; labelKey: string } {
  const sep = sectionId.indexOf(':::');
  return {
    catKey: sectionId.slice(0, sep),
    labelKey: sectionId.slice(sep + 3),
  };
}

type DropTarget = { sectionId: string; insertBeforeItemId: string | null } | null;

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
  const [labels, setLabels] = useState<ShoppingLabel[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [showAllBought, setShowAllBought] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Add bar
  const [inputText, setInputText] = useState('');
  const [inputQty, setInputQty] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<ShoppingTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  const [editingTemplate, setEditingTemplate] = useState<ShoppingTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateItemName, setNewTemplateItemName] = useState<Record<string, string>>({});
  const [newTemplateItemQty, setNewTemplateItemQty] = useState<Record<string, number>>({});
  const [newTemplateItemLabelId, setNewTemplateItemLabelId] = useState<Record<string, string | null>>({});
  const [showTmplItemLabelPicker, setShowTmplItemLabelPicker] = useState<string | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [applyCategoryId, setApplyCategoryId] = useState<string | null>(null);

  // Category manager
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ShoppingCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Label manager
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [editingLabel, setEditingLabel] = useState<ShoppingLabel | null>(null);
  const [editLabelName, setEditLabelName] = useState('');

  // DnD
  const [draggingItem, setDraggingItem] = useState<ShoppingItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const ghostY = useRef(new Animated.Value(0)).current;

  const draggingItemRef = useRef<ShoppingItem | null>(null);
  const draggingFromSectionRef = useRef<string | null>(null);
  const dropTargetRef = useRef<DropTarget>(null);
  const scrollOffsetRef = useRef(0);
  const containerTopRef = useRef(0);
  const categoryLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const sectionLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const itemLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const containerRef = useRef<View>(null);

  const startDragRef = useRef<(item: ShoppingItem, fromSection: string, pageX: number, pageY: number) => void>(() => {});
  const moveDragRef = useRef<(pageX: number, pageY: number) => void>(() => {});
  const endDragRef = useRef<() => void>(() => {});
  const itemsBySectionRef = useRef<Record<string, ShoppingItem[]>>({});

  // ── DnD callbacks (updated every render) ─────────────────────────────────────

  startDragRef.current = (item, fromSection, _pageX, pageY) => {
    draggingItemRef.current = item;
    draggingFromSectionRef.current = fromSection;
    dropTargetRef.current = null;
    ghostY.setValue(pageY - containerTopRef.current - 24);
    setDraggingItem(item);
    setDropTarget(null);
    setScrollEnabled(false);
  };

  moveDragRef.current = (_pageX, pageY) => {
    const relY = pageY - containerTopRef.current;
    ghostY.setValue(relY - 24);
    const contentY = relY + scrollOffsetRef.current;

    let targetSectionId: string | null = null;
    sectionLayoutsRef.current.forEach((layout, sectionId) => {
      if (contentY >= layout.y && contentY <= layout.y + layout.height) {
        targetSectionId = sectionId;
      }
    });

    if (targetSectionId !== null && targetSectionId !== BOUGHT_SECTION_ID) {
      // Always compute insertBefore so the insertion line shows in any target section
      let insertBeforeItemId: string | null = null;
      const sectionItems = itemsBySectionRef.current[targetSectionId] ?? [];
      for (const sectionItem of sectionItems) {
        const layout = itemLayoutsRef.current.get(sectionItem.id);
        if (!layout) continue;
        if (contentY < layout.y + layout.height / 2) {
          insertBeforeItemId = sectionItem.id;
          break;
        }
      }

      const newTarget: DropTarget = { sectionId: targetSectionId, insertBeforeItemId };
      const prev = dropTargetRef.current;
      if (
        prev?.sectionId !== newTarget.sectionId ||
        prev?.insertBeforeItemId !== newTarget.insertBeforeItemId
      ) {
        dropTargetRef.current = newTarget;
        setDropTarget(newTarget);
      }
    } else {
      if (dropTargetRef.current !== null) {
        dropTargetRef.current = null;
        setDropTarget(null);
      }
    }
  };

  endDragRef.current = () => {
    const item = draggingItemRef.current;
    const fromSection = draggingFromSectionRef.current;
    const target = dropTargetRef.current;

    draggingItemRef.current = null;
    draggingFromSectionRef.current = null;
    dropTargetRef.current = null;
    setDraggingItem(null);
    setDropTarget(null);
    setScrollEnabled(true);

    if (!item || !target || target.sectionId === BOUGHT_SECTION_ID) return;

    const { catKey: newCatKey, labelKey: newLabelKey } = parseSectionId(target.sectionId);
    const realNewCatId = newCatKey === NO_CATEGORY_KEY ? null : newCatKey;
    // Item takes on the label of the target group; no-label group → null
    const realNewLabelId = newLabelKey === NO_LABEL_KEY ? null : newLabelKey;

    // Merge if target section already has an item with the same name
    const targetSectionItems = (itemsBySectionRef.current[target.sectionId] ?? []).filter(
      (i) => i.id !== item.id
    );
    const duplicate = targetSectionItems.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (duplicate) {
      updateItemQuantity(duplicate.id, duplicate.quantity + item.quantity);
      deleteItem(item.id);
      return;
    }

    // Compute insertion position within the target section
    const sectionItems = (itemsBySectionRef.current[target.sectionId] ?? []).filter(
      (i) => i.id !== item.id
    );
    let insertIndex = sectionItems.length;
    if (target.insertBeforeItemId !== null) {
      const idx = sectionItems.findIndex((i) => i.id === target.insertBeforeItemId);
      if (idx !== -1) insertIndex = idx;
    }
    sectionItems.splice(insertIndex, 0, item);
    const sortUpdates = sectionItems.map((si, idx) => ({ id: si.id, labelSortOrder: idx }));

    if (fromSection === BOUGHT_SECTION_ID) {
      markItemNotBought(item.id, realNewCatId, realNewLabelId);
    } else {
      if ((item.categoryId ?? null) !== realNewCatId) {
        updateItemCategory(item.id, realNewCatId);
      }
      if ((item.labelId ?? null) !== realNewLabelId) {
        updateItemLabel(item.id, realNewLabelId);
      }
    }
    if (sortUpdates.length > 0) {
      updateItemLabelSortOrders(sortUpdates);
    }
  };

  const dragRefs: DragRefs = { startDragRef, moveDragRef, endDragRef };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!householdId) return;
    const unsub1 = subscribeCategories(householdId, setCategories);
    const unsub2 = subscribeLabels(householdId, setLabels);
    const unsub3 = subscribeItems(householdId, setItems, showAllBought);
    const unsub4 = subscribeTemplates(householdId, setTemplates);
    getHistory(householdId).then(setHistory);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [householdId, showAllBought]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const q = inputText.trim().toLowerCase();
    if (q.length < 1) { setSuggestions([]); return; }
    setSuggestions(
      history.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 5)
    );
  }, [inputText, history]);

  // ── Computed data ─────────────────────────────────────────────────────────────

  const { boughtItems, nonBoughtItems } = useMemo(() => {
    const bought: ShoppingItem[] = [];
    const nonBought: ShoppingItem[] = [];
    items.forEach((item) => (item.bought ? bought : nonBought).push(item));
    return { boughtItems: bought, nonBoughtItems: nonBought };
  }, [items]);

  // Group non-bought items by (categoryId, labelId), sorted by labelSortOrder within each group
  const itemsBySection = useMemo(() => {
    const map: Record<string, ShoppingItem[]> = {};
    nonBoughtItems.forEach((item) => {
      const sid = makeSectionId(item.categoryId ?? NO_CATEGORY_KEY, item.labelId ?? null);
      if (!map[sid]) map[sid] = [];
      map[sid].push(item);
    });
    Object.values(map).forEach((group) =>
      group.sort((a, b) => (a.labelSortOrder ?? 0) - (b.labelSortOrder ?? 0))
    );
    return map;
  }, [nonBoughtItems]);

  itemsBySectionRef.current = itemsBySection;

  const labelsById = useMemo(() => {
    const map: Record<string, ShoppingLabel> = {};
    labels.forEach((l) => { map[l.id] = l; });
    return map;
  }, [labels]);

  type LabelGroup = {
    sectionId: string;
    label: ShoppingLabel | null;
    items: ShoppingItem[];
    showHeader: boolean; // false when only no-label items exist in category
  };
  type CategoryGroup = {
    catKey: string;
    name: string;
    isBought: boolean;
    labelGroups: LabelGroup[];
  };

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const result: CategoryGroup[] = [];

    // All category keys to iterate (user-defined + no-category if needed)
    const catEntries: { key: string; name: string }[] = categories.map((c) => ({
      key: c.id,
      name: c.name,
    }));
    if (nonBoughtItems.some((i) => i.categoryId == null)) {
      catEntries.push({ key: NO_CATEGORY_KEY, name: t('shopping.noCategory') });
    }

    catEntries.forEach(({ key: catKey, name: catName }) => {
      const catItems = nonBoughtItems.filter(
        (i) => (i.categoryId ?? NO_CATEGORY_KEY) === catKey
      );
      if (catItems.length === 0) return;

      const hasAnyLabel = catItems.some((i) => i.labelId != null);
      const labelGroups: LabelGroup[] = [];

      if (hasAnyLabel) {
        // Sub-group per label (in label sort order)
        labels.forEach((label) => {
          const sid = makeSectionId(catKey, label.id);
          const sItems = itemsBySection[sid] ?? [];
          if (sItems.length > 0) {
            labelGroups.push({ sectionId: sid, label, items: sItems, showHeader: true });
          }
        });
        // No-label items get a header with an empty string
        const noSid = makeSectionId(catKey, null);
        const noItems = itemsBySection[noSid] ?? [];
        if (noItems.length > 0) {
          labelGroups.push({ sectionId: noSid, label: null, items: noItems, showHeader: true });
        }
      } else {
        // Only no-label items — no sub-header
        const sid = makeSectionId(catKey, null);
        const sItems = itemsBySection[sid] ?? [];
        if (sItems.length > 0) {
          labelGroups.push({ sectionId: sid, label: null, items: sItems, showHeader: false });
        }
      }

      if (labelGroups.length > 0) {
        result.push({ catKey, name: catName, isBought: false, labelGroups });
      }
    });

    if (boughtItems.length > 0) {
      result.push({ catKey: BOUGHT_SECTION_ID, name: t('shopping.bought'), isBought: true, labelGroups: [] });
    }

    return result;
  }, [categories, labels, nonBoughtItems, boughtItems, itemsBySection, t]);

  const isEmpty = categoryGroups.length === 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleAddItem() {
    const name = inputText.trim();
    if (!name || !householdId || !uid) return;

    const existing = nonBoughtItems.find(
      (i) =>
        i.name.toLowerCase() === name.toLowerCase() &&
        (i.labelId ?? null) === selectedLabelId &&
        (i.categoryId ?? null) === selectedCategoryId
    );

    setLoading(true);
    try {
      if (existing) {
        await updateItemQuantity(existing.id, existing.quantity + inputQty);
      } else {
        await addItem(householdId, name, selectedCategoryId, uid, inputQty, selectedLabelId);
      }
      setInputText('');
      setInputQty(1);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name || !householdId) return;
    await createCategory(householdId, name, categories.length);
    setNewCategoryName('');
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

  async function handleSaveEditCategory() {
    if (!editingCategory || !editCategoryName.trim()) return;
    await updateCategoryName(editingCategory.id, editCategoryName);
    setEditingCategory(null);
    setEditCategoryName('');
  }

  async function handleCreateLabel() {
    const name = newLabelName.trim();
    if (!name || !householdId) return;
    await createLabel(householdId, name, newLabelColor, labels.length);
    setNewLabelName('');
    setNewLabelColor(LABEL_COLORS[0]);
  }

  async function handleDeleteLabel(label: ShoppingLabel) {
    Alert.alert(
      t('shopping.deleteLabelTitle'),
      t('shopping.deleteLabelMessage', { name: label.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteLabel(label.id) },
      ]
    );
  }

  async function handleSaveEditLabel() {
    if (!editingLabel || !editLabelName.trim()) return;
    await updateLabelName(editingLabel.id, editLabelName);
    setEditingLabel(null);
    setEditLabelName('');
  }

  async function handleAddPresets() {
    if (!householdId) return;
    await createPresetLabels(householdId);
    Alert.alert('', t('shopping.presetsAdded'));
  }

  // ── Template handlers ─────────────────────────────────────────────────────────

  async function handleCreateTemplate() {
    const name = newTemplateName.trim();
    if (!name || !householdId || !uid) return;
    const id = await createTemplate(householdId, name, uid);
    setNewTemplateName('');
    setExpandedTemplates((prev) => ({ ...prev, [id]: true }));
  }

  async function handleDeleteTemplate(tmpl: ShoppingTemplate) {
    Alert.alert(
      t('shopping.deleteTemplateTitle'),
      t('shopping.deleteTemplateMessage', { name: tmpl.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteTemplate(tmpl.id) },
      ]
    );
  }

  async function handleSaveRenameTemplate() {
    if (!editingTemplate || !editTemplateName.trim()) return;
    await renameTemplate(editingTemplate.id, editTemplateName);
    setEditingTemplate(null);
    setEditTemplateName('');
  }

  async function handleAddTemplateItem(tmpl: ShoppingTemplate) {
    const name = (newTemplateItemName[tmpl.id] ?? '').trim();
    if (!name) return;
    const qty = newTemplateItemQty[tmpl.id] ?? 1;
    const labelId = newTemplateItemLabelId[tmpl.id] ?? null;
    const newItem: ShoppingTemplateItem = { name, quantity: Math.max(1, qty), labelId };
    await updateTemplateItems(tmpl.id, [...tmpl.items, newItem]);
    setNewTemplateItemName((prev) => ({ ...prev, [tmpl.id]: '' }));
    setNewTemplateItemQty((prev) => ({ ...prev, [tmpl.id]: 1 }));
    setNewTemplateItemLabelId((prev) => ({ ...prev, [tmpl.id]: null }));
  }

  async function handleRemoveTemplateItem(tmpl: ShoppingTemplate, index: number) {
    await updateTemplateItems(tmpl.id, tmpl.items.filter((_, i) => i !== index));
  }

  async function handleApplyTemplate(tmpl: ShoppingTemplate) {
    if (!householdId || !uid) return;
    await applyTemplate(tmpl, householdId, applyCategoryId, uid, nonBoughtItems);
    setApplyingTemplateId(null);
    setApplyCategoryId(null);
    setShowTemplateManager(false);
    Alert.alert('', t('shopping.templateApplied', { count: tmpl.items.length }));
  }

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId) ?? null;
  const selectedLabel = labels.find((l) => l.id === selectedLabelId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────

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
        <TouchableOpacity onPress={() => setShowLabelManager(true)} style={[styles.manageBtn, { marginLeft: 4 }]}>
          <Text style={styles.manageBtnText}>{t('shopping.manageLabels')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowTemplateManager(true)} style={[styles.manageBtn, { marginLeft: 4 }]}>
          <Text style={styles.manageBtnText}>{t('shopping.templates')}</Text>
        </TouchableOpacity>
        <AvatarButton />
      </View>

      {/* List */}
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
          {isEmpty && <Text style={styles.emptyText}>{t('shopping.emptyList')}</Text>}

          {categoryGroups.map((catGroup) => {
            const isOpen = collapsed[catGroup.catKey] !== true;
            const totalCount = catGroup.isBought
              ? boughtItems.length
              : catGroup.labelGroups.reduce((s, g) => s + g.items.length, 0);

            return (
              <View
                key={catGroup.catKey}
                style={styles.categorySection}
                onLayout={(e) => {
                  categoryLayoutsRef.current.set(catGroup.catKey, {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  });
                }}
              >
                {/* Category header */}
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => setCollapsed((prev) => ({ ...prev, [catGroup.catKey]: !prev[catGroup.catKey] }))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
                  <Text style={[styles.categoryTitle, catGroup.isBought && styles.categoryTitleBought]}>
                    {catGroup.name}
                  </Text>
                  <Text style={styles.categoryCount}>({totalCount})</Text>
                  {catGroup.isBought && (
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

                {/* Bought items (no sub-groups) */}
                {catGroup.isBought && isOpen && boughtItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    fromSection={BOUGHT_SECTION_ID}
                    dragRefs={dragRefs}
                    isDragging={draggingItem?.id === item.id}
                    label={item.labelId ? labelsById[item.labelId] : undefined}
                    onLabelPress={() => setShowLabelPicker(item.id)}
                    onToggle={() => toggleItemBought(item)}
                    onDelete={() => deleteItem(item.id)}
                    onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
                    canDelete={item.createdBy === uid}
                    onItemLayout={() => {}}
                  />
                ))}

                {/* Label sub-groups */}
                {!catGroup.isBought && isOpen && catGroup.labelGroups.map((group) => (
                  <View
                    key={group.sectionId}
                    onLayout={(e) => {
                      const catY = categoryLayoutsRef.current.get(catGroup.catKey)?.y ?? 0;
                      sectionLayoutsRef.current.set(group.sectionId, {
                        y: catY + e.nativeEvent.layout.y,
                        height: e.nativeEvent.layout.height,
                      });
                    }}
                  >
                    {/* Label sub-header */}
                    {group.showHeader && (
                      <View style={styles.labelSubHeader}>
                        <View
                          style={[
                            styles.labelSubDot,
                            {
                              backgroundColor: group.label?.color ?? 'transparent',
                              borderColor: group.label ? 'transparent' : c.border,
                            },
                          ]}
                        />
                        <Text style={styles.labelSubName}>
                          {group.label ? group.label.name : ' '}
                        </Text>
                      </View>
                    )}

                    {/* Items */}
                    {group.items.map((item) => {
                      const isSameSection = dropTarget?.sectionId === group.sectionId;
                      const showLineBefore =
                        isSameSection && dropTarget?.insertBeforeItemId === item.id;
                      const itemLabel = item.labelId ? labelsById[item.labelId] : undefined;

                      return (
                        <React.Fragment key={item.id}>
                          {showLineBefore && <View style={styles.insertionLine} />}
                          <ItemRow
                            item={item}
                            fromSection={group.sectionId}
                            dragRefs={dragRefs}
                            isDragging={draggingItem?.id === item.id}
                            label={itemLabel}
                            onLabelPress={() => setShowLabelPicker(item.id)}
                            onToggle={() => toggleItemBought(item)}
                            onDelete={() => deleteItem(item.id)}
                            onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
                            canDelete={item.createdBy === uid}
                            onItemLayout={(y, height) => {
                              const secY = sectionLayoutsRef.current.get(group.sectionId)?.y ?? 0;
                              itemLayoutsRef.current.set(item.id, { y: secY + y, height });
                            }}
                          />
                        </React.Fragment>
                      );
                    })}

                    {/* Insertion line after last item */}
                    {dropTarget?.sectionId === group.sectionId &&
                      dropTarget?.insertBeforeItemId === null && (
                      <View style={styles.insertionLine} />
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>

        {/* DnD ghost */}
        {draggingItem && (
          <Animated.View
            pointerEvents="none"
            style={[styles.ghost, { transform: [{ translateY: ghostY }] }]}
          >
            <Text style={styles.ghostText} numberOfLines={1}>{draggingItem.name}</Text>
          </Animated.View>
        )}
      </View>

      {/* Autocomplete suggestions */}
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

      {/* Category dropdown */}
      {showCategoryDropdown && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCategoryDropdown(false)}
          />
          <View style={[styles.dropdown, { bottom: 68 + keyboardHeight, left: SPACING.md }]}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => { setSelectedCategoryId(null); setShowCategoryDropdown(false); }}
            >
              <Text style={[styles.dropdownOptionText, !selectedCategoryId && styles.dropdownOptionActive]}>
                {t('shopping.noCategory')}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.dropdownOption}
                onPress={() => { setSelectedCategoryId(cat.id); setShowCategoryDropdown(false); }}
              >
                <Text style={[styles.dropdownOptionText, selectedCategoryId === cat.id && styles.dropdownOptionActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Label dropdown */}
      {showLabelDropdown && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowLabelDropdown(false)}
          />
          <View style={[styles.dropdown, { bottom: 68 + keyboardHeight, left: SPACING.md + 104 }]}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => { setSelectedLabelId(null); setShowLabelDropdown(false); }}
            >
              <View style={[styles.dropdownDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }]} />
              <Text style={[styles.dropdownOptionText, !selectedLabelId && styles.dropdownOptionActive]}>
                {'  '}
              </Text>
            </TouchableOpacity>
            {labels.map((label) => (
              <TouchableOpacity
                key={label.id}
                style={styles.dropdownOption}
                onPress={() => { setSelectedLabelId(label.id); setShowLabelDropdown(false); }}
              >
                <View style={[styles.dropdownDot, { backgroundColor: label.color }]} />
                <Text style={[styles.dropdownOptionText, selectedLabelId === label.id && styles.dropdownOptionActive]}>
                  {label.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Add bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.addBar}>
          <TouchableOpacity
            style={styles.pill}
            onPress={() => { setShowLabelDropdown(false); setShowCategoryDropdown((v) => !v); }}
          >
            <Text style={styles.pillText} numberOfLines={1}>
              {selectedCategory ? selectedCategory.name : t('shopping.noCategory')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, selectedLabel ? { borderColor: selectedLabel.color } : {}]}
            onPress={() => { setShowCategoryDropdown(false); setShowLabelDropdown((v) => !v); }}
          >
            {selectedLabel && <View style={[styles.pillDot, { backgroundColor: selectedLabel.color }]} />}
            <Text style={[styles.pillText, selectedLabel ? { color: selectedLabel.color } : {}]} numberOfLines={1}>
              {selectedLabel ? selectedLabel.name : ' '}
            </Text>
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
      <Modal visible={showCategoryManager} transparent animationType="fade" onRequestClose={() => setShowCategoryManager(false)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowCategoryManager(false)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.manageCategories')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {categories.map((cat) => (
                <View key={cat.id} style={styles.managerRow}>
                  {editingCategory?.id === cat.id ? (
                    <>
                      <TextInput
                        style={styles.managerEditInput}
                        value={editCategoryName}
                        onChangeText={setEditCategoryName}
                        autoFocus
                        onSubmitEditing={handleSaveEditCategory}
                      />
                      <TouchableOpacity onPress={handleSaveEditCategory}>
                        <Text style={styles.managerSaveText}>{t('common.save')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => { setEditingCategory(cat); setEditCategoryName(cat.name); }}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.managerName}>{cat.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                        <Text style={styles.managerDeleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              <View style={styles.newRow}>
                <TextInput
                  style={styles.managerEditInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder={t('shopping.newCategoryPlaceholder')}
                  placeholderTextColor={c.textSecondary}
                  onSubmitEditing={handleCreateCategory}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleCreateCategory} style={styles.newBtn}>
                  <Text style={styles.newBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Label manager modal */}
      <Modal visible={showLabelManager} transparent animationType="fade" onRequestClose={() => setShowLabelManager(false)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowLabelManager(false)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.manageLabels')}</Text>
            <TouchableOpacity style={styles.presetsBtn} onPress={handleAddPresets}>
              <Text style={styles.presetsBtnText}>{t('shopping.addPresets')}</Text>
            </TouchableOpacity>
            <ScrollView keyboardShouldPersistTaps="handled">
              {labels.map((label) => (
                <View key={label.id} style={styles.managerRow}>
                  {editingLabel?.id === label.id ? (
                    <>
                      <View style={[styles.labelSwatch, { backgroundColor: label.color }]} />
                      <TextInput
                        style={styles.managerEditInput}
                        value={editLabelName}
                        onChangeText={setEditLabelName}
                        autoFocus
                        onSubmitEditing={handleSaveEditLabel}
                      />
                      <TouchableOpacity onPress={handleSaveEditLabel}>
                        <Text style={styles.managerSaveText}>{t('common.save')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={[styles.labelSwatch, { backgroundColor: label.color }]} />
                      <TouchableOpacity
                        onPress={() => { setEditingLabel(label); setEditLabelName(label.name); }}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.managerName}>{label.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteLabel(label)}>
                        <Text style={styles.managerDeleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
              <View style={styles.newRow}>
                <TextInput
                  style={styles.managerEditInput}
                  value={newLabelName}
                  onChangeText={setNewLabelName}
                  placeholder={t('shopping.newLabelPlaceholder')}
                  placeholderTextColor={c.textSecondary}
                  onSubmitEditing={handleCreateLabel}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={handleCreateLabel} style={styles.newBtn}>
                  <Text style={styles.newBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.colorPalette}>
                {LABEL_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setNewLabelColor(color)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      newLabelColor === color && styles.colorSwatchActive,
                    ]}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Label picker modal (per item) */}
      <Modal visible={showLabelPicker !== null} transparent animationType="fade" onRequestClose={() => setShowLabelPicker(null)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowLabelPicker(null)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.labelPickerTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => { if (showLabelPicker) updateItemLabel(showLabelPicker, null); setShowLabelPicker(null); }}
              >
                <View style={[styles.pickerDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }]} />
                <Text style={styles.pickerName}>{' '}</Text>
              </TouchableOpacity>
              {labels.map((label) => (
                <TouchableOpacity
                  key={label.id}
                  style={styles.pickerRow}
                  onPress={() => { if (showLabelPicker) updateItemLabel(showLabelPicker, label.id); setShowLabelPicker(null); }}
                >
                  <View style={[styles.pickerDot, { backgroundColor: label.color }]} />
                  <Text style={styles.pickerName}>{label.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Template item label picker */}
      <Modal visible={showTmplItemLabelPicker !== null} transparent animationType="fade" onRequestClose={() => setShowTmplItemLabelPicker(null)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowTmplItemLabelPicker(null)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.labelPickerTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => {
                  if (showTmplItemLabelPicker) setNewTemplateItemLabelId((prev) => ({ ...prev, [showTmplItemLabelPicker]: null }));
                  setShowTmplItemLabelPicker(null);
                }}
              >
                <View style={[styles.pickerDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }]} />
                <Text style={styles.pickerName}>{' '}</Text>
              </TouchableOpacity>
              {labels.map((label) => (
                <TouchableOpacity
                  key={label.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    if (showTmplItemLabelPicker) setNewTemplateItemLabelId((prev) => ({ ...prev, [showTmplItemLabelPicker]: label.id }));
                    setShowTmplItemLabelPicker(null);
                  }}
                >
                  <View style={[styles.pickerDot, { backgroundColor: label.color }]} />
                  <Text style={styles.pickerName}>{label.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Template manager modal */}
      <Modal visible={showTemplateManager} transparent animationType="fade" onRequestClose={() => setShowTemplateManager(false)}>
        <TouchableOpacity style={styles.managerOverlay} activeOpacity={1} onPress={() => setShowTemplateManager(false)}>
          <View style={styles.managerDialog}>
            <Text style={styles.sheetTitle}>{t('shopping.templates')}</Text>

            {/* Create new template */}
            <View style={styles.newRow}>
              <TextInput
                style={styles.managerEditInput}
                value={newTemplateName}
                onChangeText={setNewTemplateName}
                placeholder={t('shopping.newTemplatePlaceholder')}
                placeholderTextColor={c.textSecondary}
                onSubmitEditing={handleCreateTemplate}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleCreateTemplate} style={styles.newBtn}>
                <Text style={styles.newBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {templates.map((tmpl) => {
                const isExpanded = expandedTemplates[tmpl.id] === true;
                const isApplying = applyingTemplateId === tmpl.id;
                const addLabelId = newTemplateItemLabelId[tmpl.id] ?? null;
                const addLabel = addLabelId ? labelsById[addLabelId] : null;

                return (
                  <View key={tmpl.id} style={styles.templateBlock}>
                    {/* Template header row */}
                    <View style={styles.templateHeaderRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          if (editingTemplate?.id === tmpl.id) return;
                          setExpandedTemplates((prev) => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }));
                        }}
                        onLongPress={() => { setEditingTemplate(tmpl); setEditTemplateName(tmpl.name); }}
                      >
                        {editingTemplate?.id === tmpl.id ? (
                          <TextInput
                            style={styles.managerEditInput}
                            value={editTemplateName}
                            onChangeText={setEditTemplateName}
                            autoFocus
                            onSubmitEditing={handleSaveRenameTemplate}
                            onBlur={handleSaveRenameTemplate}
                          />
                        ) : (
                          <Text style={styles.templateName}>
                            {isExpanded ? '▼ ' : '▶ '}{tmpl.name}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setApplyingTemplateId(isApplying ? null : tmpl.id);
                          setApplyCategoryId(null);
                        }}
                        style={[styles.applyBtn, isApplying && styles.applyBtnActive]}
                      >
                        <Text style={[styles.applyBtnText, isApplying && styles.applyBtnTextActive]}>
                          {t('shopping.applyTemplate')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTemplate(tmpl)} style={{ paddingLeft: 8 }}>
                        <Text style={styles.managerDeleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Category picker + confirm when applying */}
                    {isApplying && (
                      <View style={styles.applySection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.catChipRow}>
                            <TouchableOpacity
                              style={[styles.catChip, !applyCategoryId && styles.catChipActive]}
                              onPress={() => setApplyCategoryId(null)}
                            >
                              <Text style={[styles.catChipText, !applyCategoryId && styles.catChipTextActive]}>
                                {t('shopping.noCategory')}
                              </Text>
                            </TouchableOpacity>
                            {categories.map((cat) => (
                              <TouchableOpacity
                                key={cat.id}
                                style={[styles.catChip, applyCategoryId === cat.id && styles.catChipActive]}
                                onPress={() => setApplyCategoryId(cat.id)}
                              >
                                <Text style={[styles.catChipText, applyCategoryId === cat.id && styles.catChipTextActive]}>
                                  {cat.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                        <View style={styles.applyConfirmRow}>
                          <TouchableOpacity style={styles.confirmApplyBtn} onPress={() => handleApplyTemplate(tmpl)}>
                            <Text style={styles.confirmApplyBtnText}>{t('shopping.applyTemplate')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setApplyingTemplateId(null)}>
                            <Text style={styles.managerDeleteText}>{t('common.cancel')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Expanded item list */}
                    {isExpanded && (
                      <View style={styles.templateItemList}>
                        {tmpl.items.length === 0 && (
                          <Text style={styles.templateEmptyText}>{t('shopping.emptyTemplate')}</Text>
                        )}
                        {tmpl.items.map((item, idx) => {
                          const itemLabel = item.labelId ? labelsById[item.labelId] : undefined;
                          return (
                            <View key={idx} style={styles.templateItemRow}>
                              {itemLabel ? (
                                <View style={[styles.templateItemDot, { backgroundColor: itemLabel.color }]} />
                              ) : (
                                <View style={[styles.templateItemDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border }]} />
                              )}
                              <Text style={styles.templateItemName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.templateItemQty}>{item.quantity}×</Text>
                              <TouchableOpacity onPress={() => handleRemoveTemplateItem(tmpl, idx)}>
                                <Text style={styles.templateItemDelete}>×</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        {/* Add item row */}
                        <View style={styles.templateAddRow}>
                          <TextInput
                            style={[styles.managerEditInput, { flex: 1 }]}
                            value={newTemplateItemName[tmpl.id] ?? ''}
                            onChangeText={(v) => setNewTemplateItemName((prev) => ({ ...prev, [tmpl.id]: v }))}
                            placeholder={t('shopping.templateItemPlaceholder')}
                            placeholderTextColor={c.textSecondary}
                            onSubmitEditing={() => handleAddTemplateItem(tmpl)}
                            returnKeyType="done"
                          />
                          {/* Label picker pill */}
                          <TouchableOpacity
                            style={[styles.tmplLabelPill, addLabel ? { borderColor: addLabel.color } : {}]}
                            onPress={() => setShowTmplItemLabelPicker(tmpl.id)}
                          >
                            <View style={[
                              styles.tmplLabelDot,
                              addLabel
                                ? { backgroundColor: addLabel.color }
                                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
                            ]} />
                          </TouchableOpacity>
                          <QuantityStepper
                            value={newTemplateItemQty[tmpl.id] ?? 1}
                            onChange={(v) => setNewTemplateItemQty((prev) => ({ ...prev, [tmpl.id]: v }))}
                          />
                          <TouchableOpacity onPress={() => handleAddTemplateItem(tmpl)} style={styles.newBtn}>
                            <Text style={styles.newBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  fromSection,
  dragRefs,
  isDragging,
  label,
  onLabelPress,
  onToggle,
  onDelete,
  onQuantityChange,
  canDelete,
  onItemLayout,
}: {
  item: ShoppingItem;
  fromSection: string;
  dragRefs: DragRefs;
  isDragging: boolean;
  label?: ShoppingLabel;
  onLabelPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onQuantityChange: (qty: number) => void;
  canDelete: boolean;
  onItemLayout: (y: number, height: number) => void;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const itemRef = useRef(item);
  itemRef.current = item;
  const fromSectionRef = useRef(fromSection);
  fromSectionRef.current = fromSection;
  const isDragStarted = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { isDragStarted.current = false; },
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
        if (isDragStarted.current) { isDragStarted.current = false; dragRefs.endDragRef.current(); }
      },
      onPanResponderTerminate: () => {
        if (isDragStarted.current) { isDragStarted.current = false; dragRefs.endDragRef.current(); }
      },
    })
  ).current;

  return (
    <View onLayout={(e) => onItemLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
      <View style={[styles.itemRow, item.bought && styles.itemRowBought, isDragging && styles.itemRowDragging]}>
        <View {...panResponder.panHandlers} style={styles.dragHandle} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <Text style={styles.dragHandleText}>⠿</Text>
        </View>
        <TouchableOpacity onPress={onLabelPress} style={styles.labelDotBtn}>
          <View
            style={[
              styles.labelDotInner,
              { backgroundColor: label?.color ?? 'transparent', borderColor: label ? 'transparent' : c.border },
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
          {item.bought && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <Text style={[styles.itemName, item.bought && styles.itemNameBought]} numberOfLines={1}>
          {item.name}
        </Text>
        {!item.bought && <QuantityStepper value={item.quantity ?? 1} onChange={onQuantityChange} />}
        {canDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── QuantityStepper ───────────────────────────────────────────────────────────

function QuantityStepper({ value, onChange, disabled = false }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[styles.stepper, disabled && styles.stepperDisabled]}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value - 1)} disabled={disabled || value <= 1} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)} disabled={disabled} activeOpacity={0.7}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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

  // Category section
  categorySection: { gap: 2 },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs, borderRadius: 8,
  },
  chevron: { fontSize: 12, color: c.textSecondary },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: c.text, flex: 1 },
  categoryTitleBought: { color: c.textSecondary },
  categoryCount: { fontSize: 12, color: c.textSecondary },
  showOlderBtn: { fontSize: 12, color: c.primary, fontWeight: '500' },

  // Label sub-header
  labelSubHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingHorizontal: SPACING.md + 4,
    marginTop: 2,
  },
  labelSubDot: {
    width: 8, height: 8, borderRadius: 4, borderWidth: 1,
  },
  labelSubName: { fontSize: 12, fontWeight: '600', color: c.textSecondary },

  insertionLine: {
    height: 2, backgroundColor: c.primary, borderRadius: 1,
    marginHorizontal: SPACING.md, marginVertical: 1,
  },

  // Item row
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: c.card, borderRadius: 8,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: 2,
  },
  itemRowBought: { opacity: 0.45 },
  itemRowDragging: { opacity: 0.25 },
  dragHandle: { paddingRight: 2, justifyContent: 'center', alignItems: 'center' },
  dragHandleText: { fontSize: 16, color: c.textSecondary, lineHeight: 20 },
  labelDotBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginRight: 2 },
  labelDotInner: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.primary,
    justifyContent: 'center', alignItems: 'center', backgroundColor: c.card,
  },
  checkmark: { color: c.primary, fontSize: 13, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 15, color: c.text },
  itemNameBought: { textDecorationLine: 'line-through', color: c.textSecondary },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 20, color: c.textSecondary, lineHeight: 22 },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.border, borderRadius: 6, overflow: 'hidden',
  },
  stepperDisabled: { opacity: 0.35 },
  stepBtn: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  stepBtnText: { fontSize: 16, color: c.primary, fontWeight: '600', lineHeight: 20 },
  stepValue: { minWidth: 22, textAlign: 'center', fontSize: 13, fontWeight: '600', color: c.text },

  // Ghost
  ghost: {
    position: 'absolute', top: 0, left: SPACING.md, right: SPACING.md,
    backgroundColor: c.card, borderRadius: 8,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 50,
  },
  ghostText: { fontSize: 15, fontWeight: '600', color: c.text },

  // Suggestions
  suggestionsBox: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, bottom: 72,
    backgroundColor: c.card, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 4, zIndex: 10,
  },
  suggestionItem: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  suggestionText: { fontSize: 14, color: c.text },

  // Add bar
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: SPACING.xs, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: c.border, maxWidth: 96,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
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

  // Dropdowns
  dropdown: {
    position: 'absolute', minWidth: 160,
    backgroundColor: c.card, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
    zIndex: 20, overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  dropdownDot: { width: 10, height: 10, borderRadius: 5 },
  dropdownOptionText: { fontSize: 15, color: c.text },
  dropdownOptionActive: { color: c.primary, fontWeight: '700' },

  // Modals
  managerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', paddingHorizontal: SPACING.md,
  },
  managerDialog: {
    backgroundColor: c.card, borderRadius: 16,
    padding: SPACING.md, gap: SPACING.sm, maxHeight: '80%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: SPACING.xs },
  presetsBtn: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: 8, backgroundColor: c.primary + '18',
    alignSelf: 'flex-start', marginBottom: SPACING.xs,
  },
  presetsBtnText: { fontSize: 13, color: c.primary, fontWeight: '600' },
  managerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  labelSwatch: { width: 16, height: 16, borderRadius: 8 },
  managerName: { fontSize: 15, color: c.text, flex: 1 },
  managerDeleteText: { fontSize: 14, color: c.danger },
  managerSaveText: { fontSize: 14, color: c.primary, fontWeight: '600' },
  managerEditInput: {
    flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 8,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: 14, color: c.text,
  },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  newBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  newBtnText: { color: c.white, fontSize: 22, lineHeight: 26, fontWeight: '600' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: c.text },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  pickerDot: { width: 14, height: 14, borderRadius: 7 },
  pickerName: { fontSize: 15, color: c.text },

  // Templates
  templateBlock: {
    borderRadius: 10, backgroundColor: c.background,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  templateHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
  },
  templateName: { fontSize: 15, fontWeight: '600', color: c.text },
  applyBtn: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 8, backgroundColor: c.primary + '20',
  },
  applyBtnText: { fontSize: 12, color: c.primary, fontWeight: '600' },
  templateItemList: {
    paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm,
  },
  templateEmptyText: { fontSize: 13, color: c.textSecondary, paddingVertical: 4 },
  templateItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 4,
  },
  templateItemName: { flex: 1, fontSize: 14, color: c.text },
  templateItemQty: { fontSize: 13, color: c.textSecondary, minWidth: 24, textAlign: 'right' },
  templateItemDelete: { fontSize: 20, color: c.textSecondary, lineHeight: 22, paddingHorizontal: 4 },
  templateAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.xs,
  },
  applyBtnActive: { backgroundColor: c.primary + '30' },
  applyBtnTextActive: { color: c.primary, fontWeight: '700' },
  applySection: {
    paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm,
    borderTopWidth: 1, borderTopColor: c.border, marginTop: 2,
  },
  catChipRow: { flexDirection: 'row', gap: 6, paddingVertical: SPACING.xs },
  catChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: c.border,
  },
  catChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  catChipText: { fontSize: 12, color: c.textSecondary },
  catChipTextActive: { fontSize: 12, color: c.white, fontWeight: '600' },
  applyConfirmRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs,
  },
  confirmApplyBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: 8, backgroundColor: c.primary,
  },
  confirmApplyBtnText: { fontSize: 13, color: c.white, fontWeight: '600' },
  templateItemDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  tmplLabelPill: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: c.border,
    justifyContent: 'center', alignItems: 'center',
  },
  tmplLabelDot: { width: 12, height: 12, borderRadius: 6 },
});
