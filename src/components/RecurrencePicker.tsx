import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RecurrenceRule, RecurrenceType } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Colors, SPACING } from '../constants';

const WEEK_DAYS: { label: string; value: number }[] = [
  { label: 'Mo', value: 1 },
  { label: 'Di', value: 2 },
  { label: 'Mi', value: 3 },
  { label: 'Do', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'So', value: 0 },
];

const TYPES: RecurrenceType[] = ['daily', 'weekly', 'monthly'];

interface Props {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10,
    backgroundColor: c.card, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: c.text },
  options: {
    borderTopWidth: 1, borderTopColor: c.border,
    padding: SPACING.md, gap: SPACING.sm,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: 8,
    borderWidth: 1, borderColor: c.border, alignItems: 'center',
    backgroundColor: c.background,
  },
  typeBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  typeBtnTextActive: { color: c.white },
  daysRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  dayBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: c.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.background,
  },
  dayBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
  dayBtnTextActive: { color: c.white },
  monthlyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  monthlyLabel: { fontSize: 14, color: c.text },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.border, borderRadius: 8,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.background,
  },
  stepBtnText: { fontSize: 20, color: c.primary, fontWeight: '600' },
  stepValue: {
    minWidth: 36, textAlign: 'center',
    fontSize: 15, fontWeight: '600', color: c.text,
    paddingHorizontal: SPACING.xs,
  },
});

export function RecurrencePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const enabled = value !== null;

  function handleToggle(on: boolean) {
    onChange(on ? { type: 'daily' } : null);
  }

  function handleTypeChange(type: RecurrenceType) {
    if (type === 'daily') onChange({ type: 'daily' });
    else if (type === 'weekly') onChange({ type: 'weekly', days: [1] });
    else onChange({ type: 'monthly', dayOfMonth: 1 });
  }

  function handleDayToggle(day: number) {
    if (value?.type !== 'weekly') return;
    const current = value.days ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    if (next.length === 0) return;
    onChange({ type: 'weekly', days: next });
  }

  function handleDayOfMonth(delta: number) {
    if (value?.type !== 'monthly') return;
    const next = Math.min(31, Math.max(1, (value.dayOfMonth ?? 1) + delta));
    onChange({ type: 'monthly', dayOfMonth: next });
  }

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Text style={styles.label}>{t('todos.recurring')}</Text>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: c.border, true: c.primary }}
          thumbColor={c.white}
        />
      </View>

      {enabled && (
        <View style={styles.options}>
          <View style={styles.typeRow}>
            {TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, value?.type === type && styles.typeBtnActive]}
                onPress={() => handleTypeChange(type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeBtnText, value?.type === type && styles.typeBtnTextActive]}>
                  {t(`todos.recurrence_${type}` as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {value?.type === 'weekly' && (
            <View style={styles.daysRow}>
              {WEEK_DAYS.map((d) => {
                const selected = (value.days ?? []).includes(d.value);
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.dayBtn, selected && styles.dayBtnActive]}
                    onPress={() => handleDayToggle(d.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayBtnText, selected && styles.dayBtnTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {value?.type === 'monthly' && (
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>{t('todos.recurrenceDayPrefix')}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => handleDayOfMonth(-1)} activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{value.dayOfMonth ?? 1}.</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => handleDayOfMonth(1)} activeOpacity={0.7}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.monthlyLabel}>{t('todos.recurrenceDaySuffix')}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function formatRecurrence(rule: RecurrenceRule | null | undefined, t: (key: string, opts?: any) => string): string | null {
  if (!rule) return null;
  if (rule.type === 'daily') return t('todos.recurrence_daily');
  if (rule.type === 'weekly') {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const sorted = [...(rule.days ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return `${t('todos.recurrence_weekly')}: ${sorted.map((d) => names[order.indexOf(d)]).join(', ')}`;
  }
  if (rule.type === 'monthly') {
    return `${t('todos.recurrence_monthly')} (${t('todos.recurrenceDayPrefix')} ${rule.dayOfMonth ?? 1}. ${t('todos.recurrenceDaySuffix')})`;
  }
  return null;
}
