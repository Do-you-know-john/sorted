import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { CalendarEvent } from '../types';
import { Colors, SPACING } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { useHouseholdStore } from '../stores/householdStore';
import { useAuthStore } from '../stores/authStore';
import { Avatar } from './Avatar';
import i18n from '../i18n';

interface Props {
  event: CalendarEvent;
  onPress: () => void;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  meta: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 4,
  },
});

export function EventCard({ event, onPress }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const household = useHouseholdStore((s) => s.household);
  const appUser = useAuthStore((s) => s.appUser);

  const stripColor = event.color ?? c.primary;

  const timeLabel = event.allDay
    ? (i18n.language === 'de' ? 'Ganztägig' : 'All day')
    : `${format(event.startDate.toDate(), 'HH:mm')} – ${format(event.endDate.toDate(), 'HH:mm')}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.strip, { backgroundColor: stripColor }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.meta}>{timeLabel}</Text>
        {!!event.location && (
          <Text style={styles.meta} numberOfLines={1}>📍 {event.location}</Text>
        )}
        {event.assignedTo.length > 0 && (
          <View style={styles.avatarRow}>
            {event.assignedTo.slice(0, 5).map((uid) => {
              const member = household?.members[uid];
              const isSelf = uid === appUser?.uid;
              const name = member?.displayName ?? (isSelf ? appUser?.displayName : null);
              const avatarId = isSelf ? appUser?.avatarId : member?.avatarId;
              const photoURL = isSelf ? appUser?.photoURL : member?.photoURL;
              const avatarColor = isSelf ? appUser?.avatarColor : member?.avatarColor;
              return (
                <Avatar
                  key={uid}
                  avatarId={avatarId}
                  photoURL={photoURL}
                  avatarColor={avatarColor}
                  name={name}
                  size={22}
                  selfHighlight={isSelf}
                />
              );
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
