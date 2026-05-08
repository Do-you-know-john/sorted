import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../src/services/firebase';
import { completeTodo, reopenTodo, deleteTodo } from '../../../src/services/todos';
import { useAuthStore } from '../../../src/stores/authStore';
import { useHouseholdStore } from '../../../src/stores/householdStore';
import { Todo } from '../../../src/types';
import { Button } from '../../../src/components/ui/Button';
import { COLORS, SPACING } from '../../../src/constants';
import { format, isPast } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../../../src/i18n';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const household = useHouseholdStore((s) => s.household);
  const [todo, setTodo] = useState<Todo | null>(null);
  const dateLocale = i18n.language === 'de' ? de : enUS;

  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, 'todos', id), (snap) => {
      if (snap.exists()) setTodo({ id: snap.id, ...snap.data() } as Todo);
    });
  }, [id]);

  if (!todo) return null;

  const members = household ? Object.values(household.members) : [];
  const getName = (memberUid: string) => members.find((m) => m.uid === memberUid)?.displayName ?? memberUid;
  const isOverdue = todo.dueDate && isPast(todo.dueDate.toDate()) && todo.status === 'pending';

  async function handleDelete() {
    Alert.alert(t('todos.deleteTitle'), t('todos.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => { await deleteTodo(todo!.id); router.back(); },
      },
    ]);
  }

  const statusLabel = todo.status === 'completed'
    ? t('todos.statusCompleted')
    : isOverdue ? t('todos.statusOverdue') : t('todos.statusPending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.delete}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isOverdue && (
          <View style={styles.overdueBanner}>
            <Text style={styles.overdueBannerText}>{t('todos.overdueBanner')}</Text>
          </View>
        )}

        <Text style={styles.title}>{todo.title}</Text>
        {todo.description ? <Text style={styles.description}>{todo.description}</Text> : null}

        <InfoRow label={t('todos.status')} value={statusLabel} />
        {todo.dueDate && (
          <InfoRow label={t('todos.due')} value={format(todo.dueDate.toDate(), 'MMM d, yyyy · HH:mm', { locale: dateLocale })} />
        )}
        {todo.completedAt && (
          <InfoRow label={t('todos.completedAt')} value={format(todo.completedAt.toDate(), 'MMM d, yyyy · HH:mm', { locale: dateLocale })} />
        )}
        {todo.completedBy && <InfoRow label={t('todos.completedBy')} value={getName(todo.completedBy)} />}
        <InfoRow label={t('todos.createdBy')} value={getName(todo.createdBy)} />
        {todo.assignedTo.length > 0 && (
          <InfoRow label={t('todos.assignedTo')} value={todo.assignedTo.map(getName).join(', ')} />
        )}

        <View style={styles.actions}>
          {todo.status === 'pending' ? (
            <Button label={t('todos.markComplete')} onPress={() => uid && completeTodo(todo.id, uid)} />
          ) : (
            <Button label={t('todos.reopen')} onPress={() => reopenTodo(todo.id)} variant="secondary" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { color: COLORS.primary, fontSize: 16 },
  delete: { color: COLORS.danger, fontSize: 16 },
  content: { padding: SPACING.md, gap: SPACING.md },
  overdueBanner: {
    backgroundColor: COLORS.dangerLight, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.danger,
  },
  overdueBannerText: { color: COLORS.danger, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  description: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 22 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  actions: { marginTop: SPACING.md },
});
