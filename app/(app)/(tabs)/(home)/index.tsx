import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useAllHouseholds } from '../../../../src/hooks/useAllHouseholds';
import { useAllTodos, isJustCompleted } from '../../../../src/hooks/useTodos';
import { TodoCard } from '../../../../src/components/TodoCard';
import { AvatarButton } from '../../../../src/components/AvatarButton';
import { Colors, SPACING } from '../../../../src/constants';
import { useTheme } from '../../../../src/hooks/useTheme';
import { Household } from '../../../../src/types';
import { db } from '../../../../src/services/firebase';
import { isPast } from 'date-fns';
import { HouseholdIcon } from '../../../../src/components/HouseholdIcon';

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  greeting: { fontSize: 24, fontWeight: '800', color: c.text },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: c.primary, letterSpacing: 0.2,
  },
  chevron: { fontSize: 13, color: c.primary },
  householdsRow: { marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md },
  householdCard: {
    width: 160, marginRight: SPACING.sm, padding: SPACING.md,
    backgroundColor: c.card, borderRadius: 20,
    borderWidth: 1, borderColor: c.border, gap: SPACING.xs,
  },
  householdCardActive: { backgroundColor: c.primary, borderColor: c.primary },
  householdCardName: { fontSize: 15, fontWeight: '700', color: c.text },
  householdCardNameActive: { color: c.white },
  householdCardMembers: { fontSize: 12, color: c.textSecondary },
  householdCardSubActive: { color: 'rgba(255,255,255,0.7)' },
  householdCardStats: { marginTop: SPACING.xs },
  overdueChip: {
    fontSize: 12, fontWeight: '600', color: c.danger,
    backgroundColor: c.dangerLight, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start',
  },
  allDoneChip: {
    fontSize: 12, fontWeight: '600', color: c.success,
    backgroundColor: c.successLight, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start',
  },
  allDoneChipActive: { backgroundColor: 'rgba(255,255,255,0.2)', color: c.white },
  addHouseholdCard: {
    width: 130, marginRight: SPACING.sm, padding: SPACING.md,
    backgroundColor: c.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  addHouseholdText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
  emptyCard: {
    backgroundColor: c.card, borderRadius: 12, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1, borderColor: c.border,
  },
  emptyText: { fontSize: 15, color: c.textSecondary },
  addTodoBtn: {
    backgroundColor: c.card, borderRadius: 12, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: c.primary,
  },
  addTodoBtnText: { color: c.primary, fontWeight: '600', fontSize: 15 },
});

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const households = useAllHouseholds(appUser?.householdIds ?? []);
  const { todos: allTodos, loading: allLoading } = useAllTodos(
    appUser?.householdIds ?? [],
    appUser?.uid ?? null,
  );

  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const uid = appUser?.uid ?? '';
  const now = new Date();

  // Due todos assigned to self or created by self
  const upcomingTodos = allTodos
    .filter((todo) => {
      if (todo.status !== 'pending') return false;
      if (!todo.assignedTo.includes(uid) && todo.createdBy !== uid) return false;
      // New-style: show once dueFrom has passed (in window or overdue)
      if (todo.dueFrom) return todo.dueFrom.toDate() <= now;
      // Old-style (no dueFrom): show once deadline has passed
      return !!(todo.dueDate && todo.dueDate.toDate() <= now);
    })
    .sort((a, b) => {
      const aMs = (a.dueFrom ?? a.dueDate)?.toDate().getTime() ?? 0;
      const bMs = (b.dueFrom ?? b.dueDate)?.toDate().getTime() ?? 0;
      return aMs - bMs;
    })
    .slice(0, 10);

  // Just-completed todos (< 24h) assigned to self or created by self
  const recentlyCompletedTodos = allTodos
    .filter((todo) =>
      isJustCompleted(todo) &&
      (todo.assignedTo.includes(uid) || todo.createdBy === uid)
    )
    .sort((a, b) =>
      (b.completedAt?.toDate().getTime() ?? 0) - (a.completedAt?.toDate().getTime() ?? 0)
    );

  async function handleSwitchHousehold(householdId: string) {
    if (!appUser) return;
    await updateDoc(doc(db, 'users', appUser.uid), { activeHouseholdId: householdId });
  }

  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(false);

  if (!appUser) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('home.greeting', { name: appUser.displayName ?? '' })}
        </Text>
        <AvatarButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Households */}
        <Text style={styles.sectionTitle}>{t('home.myHouseholds')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.householdsRow}>
          {households.map((h) => (
            <HouseholdCard
              key={h.id}
              household={h}
              active={h.id === appUser.activeHouseholdId}
              uid={appUser.uid}
              todos={allTodos}
              onPress={() => handleSwitchHousehold(h.id)}
            />
          ))}
          <TouchableOpacity
            style={styles.addHouseholdCard}
            onPress={() => router.push('/(app)/household/setup')}
          >
            <Text style={styles.addHouseholdText}>{t('household.addHousehold')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Upcoming todos */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setUpcomingOpen((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.chevron}>{upcomingOpen ? '▼' : '▶'}</Text>
          <Text style={styles.sectionTitle}>{t('home.upcomingTodos')}</Text>
        </TouchableOpacity>
        {upcomingOpen && (allLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : upcomingTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.noTodos')}</Text>
          </View>
        ) : (
          <View style={{ gap: SPACING.xs }}>
            {upcomingTodos.map((todo) => {
              const h = households.find((hh) => hh.id === todo.householdId);
              return (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  householdName={h?.name}
                  householdAvatarId={h?.avatarId}
                />
              );
            })}
          </View>
        ))}

        {/* Recently completed */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setRecentOpen((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.chevron}>{recentOpen ? '▼' : '▶'}</Text>
          <Text style={styles.sectionTitle}>{t('home.recentlyCompleted')}</Text>
        </TouchableOpacity>
        {recentOpen && (allLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : recentlyCompletedTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.noRecentlyCompleted')}</Text>
          </View>
        ) : (
          <View style={{ gap: SPACING.xs }}>
            {recentlyCompletedTodos.map((todo) => {
              const h = households.find((hh) => hh.id === todo.householdId);
              return (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  householdName={h?.name}
                  householdAvatarId={h?.avatarId}
                />
              );
            })}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addTodoBtn}
          onPress={() => router.push('/(app)/todos/create')}
        >
          <Text style={styles.addTodoBtnText}>{t('home.addTodo')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function HouseholdCard({
  household, active, uid, todos, onPress,
}: {
  household: Household;
  active: boolean;
  uid: string;
  todos: ReturnType<typeof useAllTodos>['todos'];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const now = new Date();

  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const visibleTodos = todos.filter(
    (todo) => todo.householdId === household.id &&
      todo.status === 'pending' &&
      (todo.visibleTo.length === 0 || todo.visibleTo.includes(uid))
  );
  const overdueCount = visibleTodos.filter(
    (todo) => todo.dueDate && isPast(todo.dueDate.toDate())
  ).length;

  const memberCount = Object.keys(household.members).length;

  return (
    <TouchableOpacity
      style={[styles.householdCard, active && styles.householdCardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <HouseholdIcon avatarId={household.avatarId} size={44} />
      <Text style={[styles.householdCardName, active && styles.householdCardNameActive]} numberOfLines={1}>
        {household.name}
      </Text>
      <Text style={[styles.householdCardMembers, active && styles.householdCardSubActive]}>
        {memberCount} {memberCount === 1 ? 'member' : 'members'}
      </Text>
      <View style={styles.householdCardStats}>
        {overdueCount > 0 ? (
          <Text style={styles.overdueChip}>{t('home.overdue', { count: overdueCount })}</Text>
        ) : (
          <Text style={[styles.allDoneChip, active && styles.allDoneChipActive]}>
            {t('home.allDone')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
