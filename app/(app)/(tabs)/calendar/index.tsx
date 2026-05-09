import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  format, isSameDay, addMonths, subMonths, isToday, startOfDay,
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useEvents } from '../../../../src/hooks/useEvents';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useHouseholdStore } from '../../../../src/stores/householdStore';
import { CalendarEventView, HouseholdMember } from '../../../../src/types';
import { Colors, SPACING } from '../../../../src/constants';
import { Avatar } from '../../../../src/components/Avatar';
import { HouseholdSwitcher } from '../../../../src/components/HouseholdSwitcher';
import { EventCard } from '../../../../src/components/EventCard';
import i18n from '../../../../src/i18n';

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function chunk<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
  return chunks;
}

// Monday-first offset: Mon=0, Tue=1, ..., Sun=6
function mondayFirstOffset(date: Date): number {
  return (getDay(date) + 6) % 7;
}

interface MonthGridProps {
  currentMonth: Date;
  selectedDay: Date;
  events: CalendarEventView[];
  onSelectDay: (day: Date) => void;
  c: Colors;
}

function MonthGrid({ currentMonth, selectedDay, events, onSelectDay, c }: MonthGridProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const offset = mondayFirstOffset(startOfMonth(currentMonth));
  const cells: (Date | null)[] = [
    ...Array<null>(offset).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = format(e.startDate.toDate(), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const styles = useMemo(() => makeGridStyles(c), [c]);

  return (
    <View style={styles.grid}>
      {chunk(cells, 7).map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={styles.cell} />;
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            const isSelected = isSameDay(day, selectedDay);
            const isCurrentDay = isToday(day);
            return (
              <TouchableOpacity
                key={ci}
                style={styles.cell}
                onPress={() => onSelectDay(startOfDay(day))}
                activeOpacity={0.6}
              >
                <View style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: c.primary },
                  isCurrentDay && !isSelected && styles.todayCircle,
                ]}>
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isCurrentDay && !isSelected && { color: c.primary },
                  ]}>
                    {format(day, 'd')}
                  </Text>
                </View>
                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 3).map((e, ei) => (
                    <View
                      key={ei}
                      style={[styles.dot, { backgroundColor: e.isBlocker ? c.textSecondary : (e.color ?? c.primary) }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeGridStyles = (c: Colors) => StyleSheet.create({
  grid: { paddingHorizontal: SPACING.sm },
  row: { flexDirection: 'row' },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 48,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  dayText: {
    fontSize: 14,
    color: c.text,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: c.white,
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});

interface PersonFilterProps {
  members: HouseholdMember[];
  selectedIds: string[];
  myUid: string;
  onToggle: (uid: string) => void;
  c: Colors;
}

function PersonFilter({ members, selectedIds, myUid, onToggle, c }: PersonFilterProps) {
  const styles = useMemo(() => makeFilterStyles(c), [c]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {members.map((m) => {
        const isActive = selectedIds.includes(m.uid);
        return (
          <TouchableOpacity
            key={m.uid}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onToggle(m.uid)}
            activeOpacity={0.7}
          >
            <Avatar
              avatarId={m.avatarId}
              photoURL={m.photoURL}
              avatarColor={m.avatarColor}
              name={m.displayName}
              size={28}
              selfHighlight={m.uid === myUid}
            />
            <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]} numberOfLines={1}>
              {m.uid === myUid ? 'Du' : m.displayName.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeFilterStyles = (c: Colors) => StyleSheet.create({
  row: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.primary + '20',
    borderColor: c.primary,
  },
  chipLabel: {
    fontSize: 12,
    color: c.textSecondary,
    maxWidth: 70,
  },
  chipLabelActive: {
    color: c.primary,
    fontWeight: '600',
  },
});

function BlockerCard({ event, c }: { event: CalendarEventView; c: Colors }) {
  const timeLabel = event.allDay
    ? (i18n.language === 'de' ? 'Ganztägig' : 'All day')
    : `${format(event.startDate.toDate(), 'HH:mm')} – ${format(event.endDate.toDate(), 'HH:mm')}`;
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      opacity: 0.7,
    }}>
      <View style={{ width: 4, backgroundColor: c.textSecondary }} />
      <View style={{ flex: 1, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSecondary }}>
          {i18n.language === 'de' ? 'Beschäftigt' : 'Busy'}
        </Text>
        <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{timeLabel}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: c.text },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 18, color: c.text, lineHeight: 22 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  weekdayCell: { flex: 1, alignItems: 'center' },
  weekdayText: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
  divider: { height: 1, backgroundColor: c.border, marginVertical: SPACING.sm },
  dayHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dayTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  noEvents: {
    textAlign: 'center',
    color: c.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.lg,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: Platform.OS === 'ios' ? 24 : SPACING.lg,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: c.white, lineHeight: 32 },
});

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  const router = useRouter();
  const { t } = useTranslation();
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const dateLocale = i18n.language === 'de' ? de : enUS;
  const weekdays = i18n.language === 'de' ? WEEKDAYS_DE : WEEKDAYS_EN;

  const events = useEvents();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const household = useHouseholdStore((s) => s.household);

  const members = useMemo(() => {
    if (!household) return [];
    return Object.values(household.members);
  }, [household]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthEvents = useMemo(() => {
    return events.filter((e) => {
      const d = e.startDate.toDate();
      return d >= monthStart && d <= monthEnd;
    });
  }, [events, currentMonth]);

  const filteredMonthEvents = useMemo(() => {
    return monthEvents.filter((e) => {
      if (e.isBlocker) {
        // Blocker events only appear when a person filter is active and the person is involved
        if (selectedPersonIds.length === 0) return false;
        const involved = [...e.assignedTo, e.authorId];
        return selectedPersonIds.some((id) => involved.includes(id));
      }
      // Full-access events: apply person filter normally
      if (selectedPersonIds.length === 0) return true;
      return e.assignedTo.length === 0 || selectedPersonIds.some((id) => e.assignedTo.includes(id));
    });
  }, [monthEvents, selectedPersonIds]);

  const dayEvents = useMemo(() => {
    return filteredMonthEvents
      .filter((e) => isSameDay(e.startDate.toDate(), selectedDay))
      .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());
  }, [filteredMonthEvents, selectedDay]);

  const togglePerson = useCallback((personId: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId],
    );
  }, []);

  const dayLabel = isToday(selectedDay)
    ? t('calendar.today')
    : format(selectedDay, 'EEEE, d. MMMM', { locale: dateLocale });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <HouseholdSwitcher size="small" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {weekdays.map((d) => (
            <View key={d} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Month grid */}
        <MonthGrid
          currentMonth={currentMonth}
          selectedDay={selectedDay}
          events={filteredMonthEvents}
          onSelectDay={setSelectedDay}
          c={c}
        />

        <View style={styles.divider} />

        {/* Person filter */}
        {members.length > 1 && (
          <PersonFilter
            members={members}
            selectedIds={selectedPersonIds}
            myUid={uid ?? ''}
            onToggle={togglePerson}
            c={c}
          />
        )}

        {/* Selected day */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{dayLabel}</Text>
        </View>

        {dayEvents.length === 0 ? (
          <Text style={styles.noEvents}>{t('calendar.noEvents')}</Text>
        ) : (
          dayEvents.map((event) =>
            event.isBlocker ? (
              <BlockerCard key={event.id} event={event} c={c} />
            ) : (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/(app)/events/${event.id}` as any)}
              />
            ),
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/events/create' as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
