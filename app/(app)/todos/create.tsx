import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../../src/stores/authStore';
import { useAllHouseholds } from '../../../src/hooks/useAllHouseholds';
import { createTodo } from '../../../src/services/todos';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { Colors, SPACING } from '../../../src/constants';
import { useTheme } from '../../../src/hooks/useTheme';
import { HouseholdMember, RecurrenceRule } from '../../../src/types';
import { AssigneePicker } from '../../../src/components/AssigneePicker';
import { RecurrencePicker } from '../../../src/components/RecurrencePicker';
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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(
    appUser?.activeHouseholdId ?? ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [notifyOnComplete, setNotifyOnComplete] = useState<string[]>([]);
  const [notifyOnOverdue, setNotifyOnOverdue] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [dueFrom, setDueFrom] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date(Date.now() + 24 * 3600_000));
  const [dueUntilManuallySet, setDueUntilManuallySet] = useState(false);
  const [showDueFromPicker, setShowDueFromPicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isDirty = !submitted && (title.trim().length > 0 || description.trim().length > 0);
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
        dueFrom,
        dueDate,
        recurrence,
        priority: isUrgent ? 'urgent' : 'normal',
        createdBy: appUser!.uid,
      });
      setSubmitted(true);
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
          <Text style={styles.sectionLabel}>{t('todos.dueWindow')}</Text>

          <Text style={styles.subLabel}>{t('todos.dueFrom')}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDueFromPicker(true)}>
            <Text style={styles.dateButtonText}>
              {dueFrom
                ? format(dueFrom, 'MMM d, yyyy · HH:mm', { locale: dateLocale })
                : t('todos.immediately')}
            </Text>
          </TouchableOpacity>
          {showDueFromPicker && (
            <DateTimePicker
              value={dueFrom ?? new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                setShowDueFromPicker(Platform.OS === 'ios');
                if (date) {
                  setDueFrom(date);
                  if (!dueUntilManuallySet) {
                    setDueDate(new Date(date.getTime() + 24 * 3600_000));
                  }
                }
              }}
            />
          )}

          <Text style={[styles.subLabel, { marginTop: SPACING.sm }]}>{t('todos.dueUntil')}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDueDatePicker(true)}>
            <Text style={styles.dateButtonText}>
              {dueDate
                ? format(dueDate, 'MMM d, yyyy · HH:mm', { locale: dateLocale })
                : t('todos.noDueDate')}
            </Text>
          </TouchableOpacity>
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                setShowDueDatePicker(Platform.OS === 'ios');
                if (date) { setDueDate(date); setDueUntilManuallySet(true); }
              }}
            />
          )}

          {(dueFrom || dueDate) && (
            <TouchableOpacity onPress={() => { setDueFrom(null); setDueDate(null); setDueUntilManuallySet(false); }}>
              <Text style={styles.clearDate}>{t('todos.clearWindow')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.sectionLabel}>{t('todos.urgentLabel')}</Text>
            <Text style={styles.sectionHint}>{t('todos.urgentHint')}</Text>
          </View>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: c.border, true: c.warning }}
            thumbColor={c.white}
          />
        </View>

        <View>
          <Text style={styles.sectionLabel}>{t('todos.recurring')}</Text>
          <RecurrencePicker value={recurrence} onChange={setRecurrence} />
        </View>

        <AssigneePicker
          label={t('todos.assignTo')}
          members={members}
          selected={assignedTo[0] ?? null}
          onChange={(uid) => setAssignedTo(uid ? [uid] : [])}
          currentUserUid={appUser?.uid}
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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  navBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  navTitle: { fontSize: 17, fontWeight: '600', color: c.text },
  cancel: { color: c.primary, fontSize: 16, width: 80 },
  form: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xl * 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: SPACING.xs },
  sectionHint: { fontSize: 12, color: c.textSecondary, marginBottom: SPACING.xs },
  householdRow: { marginBottom: SPACING.xs },
  householdChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: 20, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.card, marginRight: SPACING.sm,
  },
  householdChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  householdChipText: { fontSize: 14, color: c.textSecondary },
  householdChipTextActive: { color: c.white, fontWeight: '600' },
  dateButton: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10,
    padding: SPACING.md, backgroundColor: c.card,
  },
  dateButtonText: { color: c.text, fontSize: 15 },
  clearDate: { color: c.danger, fontSize: 13, marginTop: SPACING.xs },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.sm },
  memberCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  memberCheckActive: { backgroundColor: c.primary },
  memberCheckMark: { color: c.white, fontSize: 13, fontWeight: '700' },
  memberName: { fontSize: 15, color: c.text },
  subLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary, marginBottom: SPACING.xs },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  error: { color: c.danger, fontSize: 14 },
});
