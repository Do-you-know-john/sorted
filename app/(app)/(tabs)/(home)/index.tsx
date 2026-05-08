import React, { useState } from 'react';
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
import { COLORS, SPACING } from '../../../../src/constants';
import { Household } from '../../../../src/types';
import { db } from '../../../../src/services/firebase';
import { isPast } from 'date-fns';
import { emojiForHouseholdAvatar } from '../../../../src/constants/avatars';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const households = useAllHouseholds(appUser?.householdIds ?? []);
  const { todos: allTodos, loading: allLoading } = useAllTodos(
    appUser?.householdIds ?? [],
    appUser?.uid ?? null,
  );

  const uid = appUser?.uid ?? '';
  const now = new Date();

  // Due todos assigned to self or created by self
  const upcomingTodos = allTodos
    .filter((todo) =>
      todo.status === 'pending' &&
      todo.dueDate &&
      todo.dueDate.toDate() <= now &&
      (todo.assignedTo.includes(uid) || todo.createdBy === uid)
    )
    .sort((a, b) => a.dueDate!.toDate().getTime() - b.dueDate!.toDate().getTime())
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
          <ActivityIndicator color={COLORS.primary} />
        ) : upcomingTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.noTodos')}</Text>
          </View>
        ) : (
          upcomingTodos.map((todo) => {
            const h = households.find((hh) => hh.id === todo.householdId);
            return (
              <TodoCard
                key={todo.id}
                todo={todo}
                householdName={h?.name}
                householdAvatarId={h?.avatarId}
              />
            );
          })
        ))}

        {/* Recently completed */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setRecentOpen((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.chevron}>{recentOpen ? '▼' : '▶'}</Text>
          <Text style={styles.sectionTitle}>{t('home.recentlyCompleted')}</Text>
        </TouchableOpacity>
        {recentOpen && (allLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : recentlyCompletedTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.noRecentlyCompleted')}</Text>
          </View>
        ) : (
          recentlyCompletedTodos.map((todo) => {
            const h = households.find((hh) => hh.id === todo.householdId);
            return (
              <TodoCard
                key={todo.id}
                todo={todo}
                householdName={h?.name}
                householdAvatarId={h?.avatarId}
              />
            );
          })
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
      <Text style={styles.householdCardEmoji}>
        {emojiForHouseholdAvatar(household.avatarId)}
      </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chevron: { fontSize: 14, color: COLORS.textSecondary },
  householdsRow: { marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md },
  householdCard: {
    width: 160, marginRight: SPACING.sm, padding: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  householdCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  householdCardEmoji: { fontSize: 28 },
  householdCardName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  householdCardNameActive: { color: COLORS.white },
  householdCardMembers: { fontSize: 12, color: COLORS.textSecondary },
  householdCardSubActive: { color: 'rgba(255,255,255,0.7)' },
  householdCardStats: { marginTop: SPACING.xs },
  overdueChip: {
    fontSize: 12, fontWeight: '600', color: COLORS.danger,
    backgroundColor: COLORS.dangerLight, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start',
  },
  allDoneChip: {
    fontSize: 12, fontWeight: '600', color: COLORS.success,
    backgroundColor: COLORS.successLight, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start',
  },
  allDoneChipActive: { backgroundColor: 'rgba(255,255,255,0.2)', color: COLORS.white },
  addHouseholdCard: {
    width: 130, marginRight: SPACING.sm, padding: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  addHouseholdText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  addTodoBtn: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary,
  },
  addTodoBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
});
