import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format, isPast } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Todo } from '../types';
import { COLORS, SPACING } from '../constants';
import { completeTodo, reopenTodo } from '../services/todos';
import { useAuthStore } from '../stores/authStore';
import { useHouseholdStore } from '../stores/householdStore';
import { isJustCompleted } from '../hooks/useTodos';
import { Avatar } from './Avatar';
import { emojiForHouseholdAvatar } from '../constants/avatars';
import i18n from '../i18n';

interface Props {
  todo: Todo;
  householdName?: string;
  householdAvatarId?: string | null;
}

export function TodoCard({ todo, householdName, householdAvatarId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const dateLocale = i18n.language === 'de' ? de : enUS;
  const isOverdue = todo.dueDate && isPast(todo.dueDate.toDate()) && todo.status === 'pending';
  const isCompleted = todo.status === 'completed';
  const justCompleted = isJustCompleted(todo);
  const isAssignedToMe = !!uid && todo.assignedTo.includes(uid);

  function handleToggle() {
    if (!uid) return;
    if (isCompleted) {
      reopenTodo(todo.id);
    } else if (!isAssignedToMe) {
      return;
    } else {
      Alert.alert(
        t('todos.completeConfirmTitle', { title: todo.title }),
        t('todos.completeConfirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('todos.markComplete'), style: 'default', onPress: () => completeTodo(todo.id, uid) },
        ],
      );
    }
  }

  return (
    <TouchableOpacity
      style={[styles.card, isOverdue && styles.overdue, isCompleted && styles.completed]}
      onPress={() => router.push(`/(app)/todos/${todo.id}`)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={handleToggle}
        style={[styles.checkbox, !isCompleted && !isAssignedToMe && styles.checkboxDisabled]}
        hitSlop={8}
      >
        <View style={[styles.checkCircle, isCompleted && styles.checkCircleDone]}>
          {isCompleted && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, isCompleted && styles.titleDone]} numberOfLines={1}>
          {todo.title}
        </Text>
        {householdName && (
          <Text style={styles.householdLabel}>
            {emojiForHouseholdAvatar(householdAvatarId)} {householdName}
          </Text>
        )}
        {justCompleted && !isOverdue && (
          <Text style={styles.justCompletedLabel}>{t('todos.justCompleted')}</Text>
        )}
        {todo.dueDate && !isCompleted && (
          <Text style={[styles.due, isOverdue && styles.dueOverdue]}>
            {isOverdue ? `⚠ ${t('todos.statusOverdue')} · ` : ''}
            {format(todo.dueDate.toDate(), 'MMM d, HH:mm', { locale: dateLocale })}
          </Text>
        )}
      </View>

      <AssigneeAvatars assignedTo={todo.assignedTo} />
    </TouchableOpacity>
  );
}

function AssigneeAvatars({ assignedTo }: { assignedTo: string[] }) {
  const household = useHouseholdStore((s) => s.household);
  const appUser = useAuthStore((s) => s.appUser);

  if (assignedTo.length === 0) {
    return (
      <View style={avatarStyles.unassigned}>
        <Text style={avatarStyles.unassignedDash}>—</Text>
      </View>
    );
  }

  const visible = assignedTo.slice(0, 3);
  const overflow = assignedTo.length - 3;

  return (
    <View style={avatarStyles.row}>
      {visible.map((memberId, idx) => {
        const member = household?.members[memberId];
        const isSelf = memberId === appUser?.uid;
        const name = member?.displayName ?? (isSelf ? appUser?.displayName : null);
        const avatarId = isSelf ? appUser?.avatarId : member?.avatarId;
        const photoURL = isSelf ? appUser?.photoURL : member?.photoURL;
        const avatarColor = isSelf ? appUser?.avatarColor : member?.avatarColor;
        return (
          <View
            key={memberId}
            style={[avatarStyles.slot, idx > 0 && avatarStyles.overlap]}
          >
            <Avatar
              avatarId={avatarId}
              photoURL={photoURL}
              avatarColor={avatarColor}
              name={name}
              size={28}
              selfHighlight={isSelf}
            />
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={[avatarStyles.slot, avatarStyles.overlap, avatarStyles.overflowBubble]}>
          <Text style={avatarStyles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  overdue: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  completed: { opacity: 0.55 },
  checkbox: { justifyContent: 'center', alignItems: 'center' },
  checkboxDisabled: { opacity: 0.3 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkCircleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  due: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dueOverdue: { color: COLORS.danger, fontWeight: '500' },
  householdLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  justCompletedLabel: { fontSize: 12, color: COLORS.success, marginTop: 2, fontWeight: '500' },
});

const avatarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { borderWidth: 2, borderColor: COLORS.white, borderRadius: 16 },
  overlap: { marginLeft: -8 },
  overflowBubble: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  overflowText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  unassigned: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  unassignedDash: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
});
