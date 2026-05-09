import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useAuthStore } from '../../../src/stores/authStore';
import { useHouseholdStore } from '../../../src/stores/householdStore';
import { useEventsStore } from '../../../src/stores/eventsStore';
import { deleteEvent } from '../../../src/services/events';
import { Avatar } from '../../../src/components/Avatar';
import { Colors, SPACING } from '../../../src/constants';
import { useTheme } from '../../../src/hooks/useTheme';
import i18n from '../../../src/i18n';

const VISIBILITY_ICONS: Record<string, string> = {
  private: '🔒',
  household: '🏠',
  contacts: '👥',
  custom: '✏️',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const dateLocale = i18n.language === 'de' ? de : enUS;

  const event = useEventsStore((s) => s.events.find((e) => e.id === id));
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const appUser = useAuthStore((s) => s.appUser);
  const household = useHouseholdStore((s) => s.household);

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.notFound}>{t('calendar.eventNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAuthor = event.authorId === uid;
  const stripColor = event.color ?? c.primary;

  const dateLabel = event.allDay
    ? format(event.startDate.toDate(), 'EEEE, d. MMMM yyyy', { locale: dateLocale })
    : `${format(event.startDate.toDate(), 'EEEE, d. MMMM yyyy', { locale: dateLocale })}\n${format(event.startDate.toDate(), 'HH:mm')} – ${format(event.endDate.toDate(), 'HH:mm')}`;

  function handleDelete() {
    Alert.alert(
      t('calendar.deleteTitle'),
      t('calendar.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              router.back();
            } catch {
              Alert.alert(t('common.error'));
            }
          },
        },
      ],
    );
  }

  function handleEdit() {
    router.push({ pathname: '/(app)/events/create', params: { edit: event.id } } as any);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{t('common.back')}</Text>
        </TouchableOpacity>
        {isAuthor && (
          <TouchableOpacity onPress={handleEdit}>
            <Text style={styles.editBtn}>{t('calendar.edit')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Color strip + title */}
        <View style={[styles.titleCard, { borderLeftColor: stripColor }]}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
          {!!event.location && (
            <Text style={styles.location}>📍 {event.location}</Text>
          )}
        </View>

        {/* Description */}
        {!!event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('calendar.descriptionLabel')}</Text>
            <Text style={styles.sectionText}>{event.description}</Text>
          </View>
        )}

        {/* Visibility */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('calendar.visibility')}</Text>
          <Text style={styles.infoValue}>
            {VISIBILITY_ICONS[event.visibility]} {t(`calendar.vis${capitalize(event.visibility)}`)}
          </Text>
        </View>

        {/* Assigned to */}
        {event.assignedTo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('calendar.assignTo')}</Text>
            <View style={styles.assigneeList}>
              {event.assignedTo.map((memberId) => {
                const member = household?.members[memberId];
                const isSelf = memberId === appUser?.uid;
                const name = member?.displayName ?? (isSelf ? appUser?.displayName : memberId);
                const avatarId = isSelf ? appUser?.avatarId : member?.avatarId;
                const photoURL = isSelf ? appUser?.photoURL : member?.photoURL;
                const avatarColor = isSelf ? appUser?.avatarColor : member?.avatarColor;
                return (
                  <View key={memberId} style={styles.assigneeRow}>
                    <Avatar
                      avatarId={avatarId}
                      photoURL={photoURL}
                      avatarColor={avatarColor}
                      name={name}
                      size={32}
                      selfHighlight={isSelf}
                    />
                    <Text style={styles.assigneeName}>
                      {name}{isSelf ? ` ${t('household.you')}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Created by */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('todos.createdBy')}</Text>
          <Text style={styles.infoValue}>
            {household?.members[event.authorId]?.displayName ??
              (event.authorId === appUser?.uid ? appUser?.displayName : event.authorId)}
          </Text>
        </View>

        {/* Delete button */}
        {isAuthor && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>{t('calendar.deleteEvent')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: c.textSecondary, fontSize: 15 },
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
  backBtn: { color: c.primary, fontSize: 16 },
  editBtn: { color: c.primary, fontSize: 16, fontWeight: '600' },
  content: { padding: SPACING.md, gap: SPACING.md },
  titleCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: SPACING.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  title: { fontSize: 20, fontWeight: '700', color: c.text },
  date: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
  location: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: c.border,
    gap: SPACING.xs,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
  sectionText: { fontSize: 15, color: c.text },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  infoLabel: { fontSize: 13, color: c.textSecondary },
  infoValue: { fontSize: 14, color: c.text, fontWeight: '600' },
  assigneeList: { gap: SPACING.xs },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assigneeName: { fontSize: 14, color: c.text },
  deleteBtn: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.danger,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  deleteBtnText: { color: c.danger, fontSize: 15, fontWeight: '600' },
});
