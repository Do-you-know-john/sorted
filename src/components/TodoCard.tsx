import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format, isPast } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Todo } from '../types';
import { Colors, SPACING } from '../constants';
import { completeTodo, reopenTodo } from '../services/todos';
import { useAuthStore } from '../stores/authStore';
import { useHouseholdStore } from '../stores/householdStore';
import { isJustCompleted } from '../hooks/useTodos';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { emojiForHouseholdAvatar } from '../constants/avatars';
import i18n from '../i18n';

interface Props {
  todo: Todo;
  householdName?: string;
  householdAvatarId?: string | null;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
    borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: c.border, gap: SPACING.sm,
  },
  overdue: { borderColor: c.danger, backgroundColor: c.dangerLight },
  completed: { opacity: 0.55 },
  checkbox: { justifyContent: 'center', alignItems: 'center' },
  checkboxDisabled: { opacity: 0.3 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  checkCircleDone: { backgroundColor: c.primary, borderColor: c.primary },
  checkMark: { color: c.white, fontSize: 14, fontWeight: '700' },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500', color: c.text },
  titleDone: { textDecorationLine: 'line-through', color: c.textSecondary },
  due: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  dueOverdue: { color: c.danger, fontWeight: '500' },
  householdLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  justCompletedLabel: { fontSize: 12, color: c.success, marginTop: 2, fontWeight: '500' },
});

const makeAvatarStyles = (c: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: { borderWidth: 2, borderColor: c.white, borderRadius: 20 },
  overlap: { marginLeft: -10 },
  overflowBubble: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: c.border,
    justifyContent: 'center', alignItems: 'center',
  },
  overflowText: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  unassigned: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: c.background,
    borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  unassignedDash: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
});

export function TodoCard({ todo, householdName, householdAvatarId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const dateLocale = i18n.language === 'de' ? de : enUS;
  const isOverdue = todo.dueDate && isPast(todo.dueDate.toDate()) && todo.status === 'pending';
  const isCompleted = todo.status === 'completed';
  const justCompleted = isJustCompleted(todo);
  const isAssignedToMe = !!uid && todo.assignedTo.includes(uid);
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

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
      <AssigneeAvatars assignedTo={todo.assignedTo} />

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

      <TouchableOpacity
        onPress={handleToggle}
        style={[styles.checkbox, !isCompleted && !isAssignedToMe && styles.checkboxDisabled]}
        hitSlop={8}
      >
        <View style={[styles.checkCircle, isCompleted && styles.checkCircleDone]}>
          {isCompleted && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function AssigneeAvatars({ assignedTo }: { assignedTo: string[] }) {
  const household = useHouseholdStore((s) => s.household);
  const appUser = useAuthStore((s) => s.appUser);
  const c = useTheme();
  const avatarStyles = useMemo(() => makeAvatarStyles(c), [c]);

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
              size={38}
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
