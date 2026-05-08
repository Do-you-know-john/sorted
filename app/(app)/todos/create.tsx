import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../../src/stores/authStore';
import { useAllHouseholds } from '../../../src/hooks/useAllHouseholds';
import { createTodo } from '../../../src/services/todos';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { COLORS, SPACING } from '../../../src/constants';
import { HouseholdMember } from '../../../src/types';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../../../src/i18n';
import { useDiscardGuard } from '../../../src/hooks/useDiscardGuard';

export default function CreateTodoScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const households = useAllHouseholds(appUser?.householdIds ?? []);
  const dateLocale = i18n.language === 'de' ? de : enUS;

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    appUser?.activeHouseholdId ?? ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [notifyOnComplete, setNotifyOnComplete] = useState<string[]>([]);
  const [notifyOnOverdue, setNotifyOnOverdue] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDirty = title.trim().length > 0 || description.trim().length > 0;
  useDiscardGuard(isDirty);

  const selectedHousehold = households.find((h) => h.id === selectedHouseholdId);
  const members: HouseholdMember[] = selectedHousehold
    ? Object.values(selectedHousehold.members)
    : [];

  function handleSelectHousehold(id: string) {
    setSelectedHouseholdId(id);
    // Reset member-specific fields when household changes
    setAssignedTo([]);
    setVisibleTo([]);
    setNotifyOnComplete([]);
    setNotifyOnOverdue([]);
  }

  function toggleMember(uid: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(uid) ? list.filter((id) => id !== uid) : [...list, uid]);
  }

  async function handleCreate() {
    if (!title.trim()) { setError(t('todos.titleRequired')); return; }
    if (!selectedHouseholdId) return;
    setError('');
    setLoading(true);
    try {
      await createTodo({
        householdId: selectedHouseholdId,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo,
        visibleTo,
        notifyOnComplete,
        notifyOnOverdue,
        dueDate,
        createdBy: appUser!.uid,
      });
      router.back();
    } catch (e: any) {
      setError(e.message ?? t('todos.createFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{t('todos.newTodo')}</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

        {/* Household picker — only shown when user is in multiple households */}
        {households.length > 1 && (
          <View>
            <Text style={styles.sectionLabel}>{t('household.householdName')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.householdRow}>
              {households.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.householdChip, h.id === selectedHouseholdId && styles.householdChipActive]}
                  onPress={() => handleSelectHousehold(h.id)}
                >
                  <Text style={[styles.householdChipText, h.id === selectedHouseholdId && styles.householdChipTextActive]}>
                    {h.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <TextInput
          label={t('todos.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('todos.titlePlaceholder')}
        />
        <TextInput
          label={t('todos.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('todos.descriptionPlaceholder')}
          multiline
          numberOfLines={3}
          style={{ minHeight: 72, textAlignVertical: 'top' }}
        />

        <View>
          <Text style={styles.sectionLabel}>{t('todos.dueDate')}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>
              {dueDate
                ? format(dueDate, 'MMM d, yyyy · HH:mm', { locale: dateLocale })
                : t('todos.noDueDate')}
            </Text>
          </TouchableOpacity>
          {dueDate && (
            <TouchableOpacity onPress={() => setDueDate(null)}>
              <Text style={styles.clearDate}>{t('todos.clearDate')}</Text>
            </TouchableOpacity>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDueDate(date);
              }}
            />
          )}
        </View>

        <MemberSelector
          label={t('todos.assignTo')}
          members={members}
          selected={assignedTo}
          onToggle={(uid) => toggleMember(uid, assignedTo, setAssignedTo)}
        />

        <View>
          <Text style={styles.sectionLabel}>{t('todos.visibleTo')}</Text>
          <Text style={styles.sectionHint}>{t('todos.visibleToHint')}</Text>
          <MemberSelector
            members={members}
            selected={visibleTo}
            onToggle={(uid) => toggleMember(uid, visibleTo, setVisibleTo)}
          />
        </View>

        <MemberSelector
          label={t('todos.notifyOnComplete')}
          members={members}
          selected={notifyOnComplete}
          onToggle={(uid) => toggleMember(uid, notifyOnComplete, setNotifyOnComplete)}
        />
        <MemberSelector
          label={t('todos.notifyOnOverdue')}
          members={members}
          selected={notifyOnOverdue}
          onToggle={(uid) => toggleMember(uid, notifyOnOverdue, setNotifyOnOverdue)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={t('todos.createTodo')} onPress={handleCreate} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberSelector({
  label, members, selected, onToggle,
}: {
  label?: string;
  members: HouseholdMember[];
  selected: string[];
  onToggle: (uid: string) => void;
}) {
  return (
    <View>
      {label && <Text style={styles.sectionLabel}>{label}</Text>}
      {members.map((m) => (
        <TouchableOpacity key={m.uid} style={styles.memberRow} onPress={() => onToggle(m.uid)}>
          <View style={[styles.memberCheck, selected.includes(m.uid) && styles.memberCheckActive]}>
            {selected.includes(m.uid) && <Text style={styles.memberCheckMark}>✓</Text>}
          </View>
          <Text style={styles.memberName}>{m.displayName}</Text>
        </TouchableOpacity>
      ))}
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
  navTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  cancel: { color: COLORS.primary, fontSize: 16, width: 80 },
  form: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  householdRow: { marginBottom: SPACING.xs },
  householdChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white, marginRight: SPACING.sm,
  },
  householdChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  householdChipText: { fontSize: 14, color: COLORS.textSecondary },
  householdChipTextActive: { color: COLORS.white, fontWeight: '600' },
  dateButton: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: SPACING.md, backgroundColor: COLORS.white,
  },
  dateButtonText: { color: COLORS.text, fontSize: 15 },
  clearDate: { color: COLORS.danger, fontSize: 13, marginTop: SPACING.xs },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.sm },
  memberCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  memberCheckActive: { backgroundColor: COLORS.primary },
  memberCheckMark: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  memberName: { fontSize: 15, color: COLORS.text },
  error: { color: COLORS.danger, fontSize: 14 },
});
