import React, { useMemo, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useHouseholdStore } from '../../../../src/stores/householdStore';
import { useTodos, useGroupedTodos, isJustCompleted } from '../../../../src/hooks/useTodos';
import { TodoCard } from '../../../../src/components/TodoCard';
import { AvatarButton } from '../../../../src/components/AvatarButton';
import { HouseholdSwitcher } from '../../../../src/components/HouseholdSwitcher';
import { Colors, SPACING } from '../../../../src/constants';
import { useTheme } from '../../../../src/hooks/useTheme';

export default function TodosScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const household = useHouseholdStore((s) => s.household);
  const { todos, loading } = useTodos(appUser?.activeHouseholdId ?? null, appUser?.uid ?? null);
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const uid = appUser?.uid ?? '';
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const grouped = useGroupedTodos(todos, { showAllCompleted, onlyMine, uid });
  const members = household ? Object.values(household.members) : [];

  const sections = Object.entries(grouped).map(([uid, items]) => {
    const member = members.find((m) => m.uid === uid);
    return {
      title: member?.displayName ?? (uid === 'unassigned' ? t('todos.unassigned') : uid),
      data: items,
    };
  }).sort((a, b) => {
    if (a.title === appUser?.displayName) return -1;
    if (b.title === appUser?.displayName) return 1;
    return a.title.localeCompare(b.title);
  });

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={c.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <HouseholdSwitcher />
        </View>
        <AvatarButton />
      </View>

      <View style={styles.filters}>
        <FilterChip
          label={t('todos.onlyMine')}
          active={onlyMine}
          onPress={() => setOnlyMine((v) => !v)}
        />
        <FilterChip
          label={t('todos.showAllCompleted')}
          active={showAllCompleted}
          onPress={() => setShowAllCompleted((v) => !v)}
        />
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('todos.noTodos')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TodoCard
              todo={item}
              householdName={household?.name}
              householdAvatarId={household?.avatarId}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/todos/create')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  filters: { flexDirection: 'row', padding: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
  },
  chipActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
  chipText: { fontSize: 13, color: c.textSecondary },
  chipTextActive: { color: c.primary, fontWeight: '600' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 96 },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: 16, color: c.textSecondary },
  fab: {
    position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
  },
  fabText: { color: c.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
