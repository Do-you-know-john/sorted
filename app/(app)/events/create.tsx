import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openAndroidPicker } from '../../../src/utils/datePicker';
import { format } from 'date-fns';
import { useAuthStore } from '../../../src/stores/authStore';
import { useHouseholdStore } from '../../../src/stores/householdStore';
import { useEventsStore } from '../../../src/stores/eventsStore';
import {
  createEvent, updateEvent, computeViewerIds, computeBlockerIds,
  fetchHouseholdsByIds, CreateEventInput,
} from '../../../src/services/events';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { Avatar } from '../../../src/components/Avatar';
import { Colors, SPACING } from '../../../src/constants';
import { EVENT_COLORS } from '../../../src/constants/eventColors';
import { useTheme } from '../../../src/hooks/useTheme';
import { useDiscardGuard } from '../../../src/hooks/useDiscardGuard';
import { EventVisibility, Household, HouseholdMember } from '../../../src/types';

const VISIBILITY_OPTIONS: { value: EventVisibility; labelKey: string }[] = [
  { value: 'private', labelKey: 'calendar.visPrivate' },
  { value: 'household', labelKey: 'calendar.visHousehold' },
  { value: 'contacts', labelKey: 'calendar.visContacts' },
  { value: 'custom', labelKey: 'calendar.visCustom' },
];

function roundToNextHour(d: Date): Date {
  const r = new Date(d);
  r.setMinutes(0, 0, 0);
  r.setHours(r.getHours() + 1);
  return r;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { edit: editId, date: dateParam } = useLocalSearchParams<{ edit?: string; date?: string }>();
  const isEditing = !!editId;

  const appUser = useAuthStore((s) => s.appUser);
  const household = useHouseholdStore((s) => s.household);
  const existingEvent = useEventsStore((s) =>
    editId ? s.events.find((e) => e.id === editId) : undefined,
  );

  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => {
    const base = dateParam ? new Date(dateParam) : new Date();
    return roundToNextHour(base);
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const base = dateParam ? new Date(dateParam) : new Date();
    const d = roundToNextHour(base);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [color, setColor] = useState<typeof EVENT_COLORS[number]>(EVENT_COLORS[0]);
  const [visibility, setVisibility] = useState<EventVisibility>('household');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [visibleToHouseholds, setVisibleToHouseholds] = useState<string[]>([]);
  const [visibleToUsers, setVisibleToUsers] = useState<string[]>([]);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);

  const allEvents = useEventsStore((s) => s.events);
  const conflictingEvents = useMemo(() => {
    if (allDay || !appUser) return [];
    const assigneeSet = new Set<string>([appUser.uid, ...assignedTo]);
    return allEvents.filter((e) => {
      if (e.id === editId) return false;
      if (e.allDay) return false;
      const eStart = e.startDate.toMillis();
      const eEnd = e.endDate.toMillis();
      const nStart = startDate.getTime();
      const nEnd = endDate.getTime();
      if (eStart >= nEnd || eEnd <= nStart) return false;
      const involved = new Set([...e.assignedTo, e.authorId]);
      return [...assigneeSet].some((id) => involved.has(id));
    });
  }, [allEvents, allDay, assignedTo, startDate, endDate, appUser, editId]);

  // Pre-fill form when editing
  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description ?? '');
      setLocation(existingEvent.location ?? '');
      setAllDay(existingEvent.allDay);
      setStartDate(existingEvent.startDate.toDate());
      setEndDate(existingEvent.endDate.toDate());
      setColor((existingEvent.color as typeof EVENT_COLORS[number]) ?? EVENT_COLORS[0]);
      setVisibility(existingEvent.visibility);
      setAssignedTo(existingEvent.assignedTo);
      setVisibleToHouseholds(existingEvent.visibleToHouseholds);
      setVisibleToUsers(existingEvent.visibleToUsers);
    }
  }, [existingEvent]);

  // Always fetch all households on mount — needed for blockerIds computation regardless of visibility
  useEffect(() => {
    if (appUser && allHouseholds.length === 0) {
      fetchHouseholdsByIds(appUser.householdIds).then(setAllHouseholds);
    }
  }, [appUser]);

  const isDirty = !submitted && title.trim().length > 0;
  useDiscardGuard(isDirty);

  const members: HouseholdMember[] = useMemo(() => {
    if (!household) return [];
    return Object.values(household.members);
  }, [household]);

  // For custom visibility: all people across loaded households
  const allContacts = useMemo(() => {
    const map = new Map<string, HouseholdMember & { fromHousehold: string }>();
    allHouseholds.forEach((h) => {
      Object.values(h.members).forEach((m) => {
        if (!map.has(m.uid)) map.set(m.uid, { ...m, fromHousehold: h.name });
      });
    });
    return Array.from(map.values());
  }, [allHouseholds]);

  function toggleAssignee(uid: string) {
    setAssignedTo((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  function toggleVisibleHousehold(id: string) {
    setVisibleToHouseholds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id],
    );
  }

  function toggleVisibleUser(uid: string) {
    setVisibleToUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  async function handleSubmit() {
    if (!title.trim()) { setError(t('calendar.titleRequired')); return; }
    if (!appUser || !household) { setError(t('household.notLoggedIn')); return; }
    if (endDate <= startDate && !allDay) { setError(t('calendar.endBeforeStart')); return; }

    setError('');
    setLoading(true);
    try {
      const primaryHousehold = household;
      const householdsForCompute =
        allHouseholds.length > 0 ? allHouseholds : [household];

      const viewerIds = computeViewerIds(
        appUser.uid,
        visibility,
        primaryHousehold,
        householdsForCompute,
        visibleToHouseholds,
        visibleToUsers,
      );

      const blockerIds = computeBlockerIds(appUser.uid, householdsForCompute, viewerIds);

      const input: CreateEventInput = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        endDate: allDay ? startDate : endDate,
        allDay,
        householdId: household.id,
        assignedTo,
        visibility,
        visibleToHouseholds,
        visibleToUsers,
        color,
      };

      if (isEditing && editId) {
        await updateEvent(editId, { ...input, viewerIds, blockerIds });
      } else {
        await createEvent(input, appUser.uid, viewerIds, blockerIds);
      }

      setSubmitted(true);
      router.back();
    } catch (e: any) {
      setError(e.message ?? t('calendar.saveFailed'));
    } finally {
      setLoading(false);
    }
  }

  const datePickerMode = allDay ? 'date' : 'datetime';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>
          {isEditing ? t('calendar.editEvent') : t('calendar.newEvent')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Title */}
          <TextInput
            label={t('calendar.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('calendar.titlePlaceholder')}
          />

          {/* Description */}
          <TextInput
            label={t('calendar.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('calendar.descriptionPlaceholder')}
            multiline
          />

          {/* Location */}
          <TextInput
            label={t('calendar.locationLabel')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('calendar.locationPlaceholder')}
          />

          {/* All day toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('calendar.allDay')}</Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ true: c.primary }}
              thumbColor={c.white}
            />
          </View>

          {/* Start date */}
          <View style={styles.dateRow}>
            <Text style={styles.fieldLabel}>{t('calendar.startDate')}</Text>
            <TouchableOpacity
              style={styles.datePill}
              onPress={() => {
                if (Platform.OS === 'android') {
                  openAndroidPicker(startDate, datePickerMode, (date) => {
                    setStartDate(date);
                    if (date >= endDate) setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                  });
                } else {
                  setShowStartPicker((v) => !v);
                }
              }}
            >
              <Text style={styles.datePillText}>
                {allDay
                  ? format(startDate, 'dd.MM.yyyy')
                  : format(startDate, 'dd.MM.yyyy HH:mm')}
              </Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'ios' && showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode={datePickerMode}
              display="spinner"
              textColor={c.text}
              onChange={(_, date) => {
                if (date) {
                  setStartDate(date);
                  if (date >= endDate) setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                }
              }}
            />
          )}

          {/* End date */}
          {!allDay && (
            <>
              <View style={styles.dateRow}>
                <Text style={styles.fieldLabel}>{t('calendar.endDate')}</Text>
                <TouchableOpacity
                  style={styles.datePill}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      openAndroidPicker(endDate, 'datetime', setEndDate, { minimumDate: startDate });
                    } else {
                      setShowEndPicker((v) => !v);
                    }
                  }}
                >
                  <Text style={styles.datePillText}>
                    {format(endDate, 'dd.MM.yyyy HH:mm')}
                  </Text>
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' && showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="datetime"
                  minimumDate={startDate}
                  display="spinner"
                  textColor={c.text}
                  onChange={(_, date) => {
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </>
          )}

          {/* Color picker */}
          <Text style={styles.fieldLabel}>{t('calendar.color')}</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                style={[
                  styles.colorDot,
                  { backgroundColor: col },
                  color === col && styles.colorDotActive,
                ]}
                onPress={() => setColor(col)}
              />
            ))}
          </View>

          {/* Visibility */}
          <Text style={styles.fieldLabel}>{t('calendar.visibility')}</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.visChip, visibility === opt.value && styles.visChipActive]}
                onPress={() => setVisibility(opt.value)}
              >
                <Text style={[styles.visChipText, visibility === opt.value && styles.visChipTextActive]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom visibility: select households */}
          {visibility === 'custom' && allHouseholds.length > 0 && (
            <>
              <Text style={styles.subLabel}>{t('calendar.visibleToHouseholds')}</Text>
              {allHouseholds.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={styles.checkRow}
                  onPress={() => toggleVisibleHousehold(h.id)}
                >
                  <View style={[styles.checkbox, visibleToHouseholds.includes(h.id) && styles.checkboxChecked]}>
                    {visibleToHouseholds.includes(h.id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>{h.name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.subLabel}>{t('calendar.visibleToPersons')}</Text>
              {allContacts.filter((m) => m.uid !== appUser?.uid).map((m) => (
                <TouchableOpacity
                  key={m.uid}
                  style={styles.checkRow}
                  onPress={() => toggleVisibleUser(m.uid)}
                >
                  <View style={[styles.checkbox, visibleToUsers.includes(m.uid) && styles.checkboxChecked]}>
                    {visibleToUsers.includes(m.uid) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Avatar
                    avatarId={m.avatarId}
                    photoURL={m.photoURL}
                    avatarColor={m.avatarColor}
                    name={m.displayName}
                    size={28}
                  />
                  <Text style={styles.checkLabel}>{m.displayName}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Assign to */}
          <Text style={styles.fieldLabel}>{t('calendar.assignTo')}</Text>
          <View style={styles.memberList}>
            {members.map((m) => {
              const isMe = m.uid === appUser?.uid;
              const selected = assignedTo.includes(m.uid);
              return (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberRow, selected && styles.memberRowActive]}
                  onPress={() => toggleAssignee(m.uid)}
                >
                  <Avatar
                    avatarId={m.avatarId}
                    photoURL={m.photoURL}
                    avatarColor={m.avatarColor}
                    name={m.displayName}
                    size={32}
                    selfHighlight={isMe}
                  />
                  <Text style={styles.memberName}>
                    {isMe ? `${m.displayName} ${t('household.you')}` : m.displayName}
                  </Text>
                  {selected && <Text style={styles.selectedMark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {conflictingEvents.length > 0 && (
            <View style={styles.conflictBox}>
              <Text style={styles.conflictTitle}>⚠ {t('calendar.conflictWarning')}</Text>
              {conflictingEvents.slice(0, 3).map((e, i) => (
                <Text key={i} style={styles.conflictItem}>
                  · {e.isBlocker ? t('calendar.conflictBusy') : e.title}
                </Text>
              ))}
              {conflictingEvents.length > 3 && (
                <Text style={styles.conflictItem}>+{conflictingEvents.length - 3} {t('calendar.conflictMore')}</Text>
              )}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={isEditing ? t('common.save') : t('calendar.createEvent')}
            onPress={handleSubmit}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  cancelBtn: { color: c.primary, fontSize: 16, width: 60 },
  navTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  content: { padding: SPACING.md, gap: SPACING.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 4 },
  subLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary, marginTop: SPACING.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  toggleLabel: { fontSize: 15, color: c.text },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  datePill: {
    backgroundColor: c.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  datePillText: { fontSize: 14, color: c.primary, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: c.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  visChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  visChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  visChipText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
  visChipTextActive: { color: c.white },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: c.primary, borderColor: c.primary },
  checkmark: { color: c.white, fontSize: 13, fontWeight: '700' },
  checkLabel: { fontSize: 14, color: c.text },
  memberList: { gap: SPACING.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  memberRowActive: { borderColor: c.primary, backgroundColor: c.primary + '12' },
  memberName: { flex: 1, fontSize: 14, color: c.text },
  selectedMark: { color: c.primary, fontSize: 16, fontWeight: '700' },
  error: { color: c.danger, fontSize: 14 },
  conflictBox: {
    backgroundColor: c.warningLight,
    borderRadius: 10,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: c.warning,
    gap: 4,
  },
  conflictTitle: { fontSize: 13, fontWeight: '700', color: c.warning },
  conflictItem: { fontSize: 12, color: c.text },
});
