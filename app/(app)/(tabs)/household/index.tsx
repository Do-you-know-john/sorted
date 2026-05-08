import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, Modal, TextInput as RNTextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useHouseholdStore } from '../../../../src/stores/householdStore';
import { refreshInviteCode, getTodoCount, deleteHousehold, updateHouseholdAvatar } from '../../../../src/services/households';
import { HOUSEHOLD_AVATARS } from '../../../../src/constants/avatars';
import { HouseholdIcon } from '../../../../src/components/HouseholdIcon';
import { HouseholdSwitcher } from '../../../../src/components/HouseholdSwitcher';
import { logout } from '../../../../src/services/auth';
import { Button } from '../../../../src/components/ui/Button';
import { Colors, SPACING } from '../../../../src/constants';
import { useTheme } from '../../../../src/hooks/useTheme';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../../../../src/i18n';

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const household = useHouseholdStore((s) => s.household);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const members = household ? Object.values(household.members) : [];
  const isAdmin = household?.members[appUser?.uid ?? '']?.role === 'admin';
  const codeExpiry = household?.inviteCodeExpiresAt?.toDate();
  const codeExpired = codeExpiry ? codeExpiry < new Date() : false;
  const dateLocale = i18n.language === 'de' ? de : enUS;

  async function handleSelectAvatar(avatarId: string) {
    if (!household) return;
    setAvatarLoading(true);
    try {
      await updateHouseholdAvatar(household.id, avatarId);
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleShare() {
    if (!household) return;
    await Share.share({
      message: t('household.shareMessage', { name: household.name, code: household.inviteCode }),
    });
  }

  async function handleRefreshCode() {
    if (!household) return;
    setRefreshing(true);
    try {
      await refreshInviteCode(household.id);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  }

  async function handleDeletePress() {
    if (!household || !appUser) return;
    const todoCount = await getTodoCount(household.id);
    Alert.alert(
      t('household.deleteTitle'),
      t('household.deleteWarning', {
        name: household.name,
        todos: todoCount,
        members: members.length,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.continue', { defaultValue: 'Continue' }),
          style: 'destructive',
          onPress: () => {
            setConfirmInput('');
            setDeleteModalVisible(true);
          },
        },
      ]
    );
  }

  async function handleDeleteConfirm() {
    if (!household || !appUser) return;
    if (confirmInput.trim() !== household.name) return;
    setDeleting(true);
    try {
      const remainingIds = appUser.householdIds ?? [];
      await deleteHousehold(household.id, appUser.uid, remainingIds);
      setDeleteModalVisible(false);
      const nextId = remainingIds.find((id) => id !== household.id);
      if (nextId) {
        router.replace('/(app)/(tabs)/(home)');
      } else {
        router.replace('/(app)/household/setup');
      }
    } catch {
      Alert.alert(t('common.error'), t('household.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <HouseholdSwitcher size="large" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t('household.avatar')}</Text>
            {avatarLoading && <ActivityIndicator size="small" color={c.primary} />}
          </View>
          <View style={styles.emojiGrid}>
            {HOUSEHOLD_AVATARS.map((a) => {
              const isActive = (household?.avatarId ?? 'house') === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.emojiBtn, isActive && styles.emojiBtnActive]}
                  onPress={() => handleSelectAvatar(a.id)}
                  disabled={avatarLoading}
                >
                  <HouseholdIcon avatarId={a.id} size={38} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('household.inviteCodeLabel')}</Text>
          <Text style={[styles.code, codeExpired && styles.codeExpired]}>
            {household?.inviteCode ?? '------'}
          </Text>
          {codeExpiry && (
            <Text style={[styles.expiry, codeExpired && styles.expiryExpired]}>
              {codeExpired
                ? t('household.expired')
                : t('household.expires', { date: format(codeExpiry, 'MMM d, HH:mm', { locale: dateLocale }) })}
            </Text>
          )}
          <View style={styles.codeActions}>
            <Button label={t('household.shareCode')} onPress={handleShare} variant="secondary" style={{ flex: 1 }} />
            {isAdmin && (
              <Button label={t('household.refresh')} onPress={handleRefreshCode} loading={refreshing} variant="secondary" style={{ flex: 1 }} />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('household.members')} ({members.length})</Text>
          {members.map((m) => (
            <View key={m.uid} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{m.displayName[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.displayName} {m.uid === appUser?.uid ? t('household.you') : ''}
                </Text>
                <Text style={styles.memberEmail}>{m.email}</Text>
              </View>
              <Text style={styles.role}>{m.role}</Text>
            </View>
          ))}
        </View>

        {isAdmin && (
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={[styles.cardTitle, styles.dangerTitle]}>{t('household.dangerZone')}</Text>
            <Button
              label={t('household.deleteTitle')}
              onPress={handleDeletePress}
              variant="danger"
            />
          </View>
        )}

        <Button label={t('auth.logout')} onPress={handleLogout} variant="danger" />
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('household.deleteTitle')}</Text>
            <Text style={styles.modalHint}>{t('household.deleteConfirmHint')}</Text>
            <RNTextInput
              style={styles.modalInput}
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder={household?.name ?? ''}
              placeholderTextColor={c.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="light"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)} disabled={deleting}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, confirmInput.trim() !== (household?.name ?? '') && styles.confirmBtnDisabled]}
                onPress={handleDeleteConfirm}
                disabled={confirmInput.trim() !== (household?.name ?? '') || deleting}
              >
                {deleting
                  ? <ActivityIndicator color={c.white} />
                  : <Text style={styles.confirmBtnText}>{t('household.deleteBtn')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: {
    borderRadius: 16, borderWidth: 2, borderColor: 'transparent',
    padding: 3,
  },
  emojiBtnActive: { borderColor: c.primary },
  card: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  dangerCard: { borderColor: c.danger + '44' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerTitle: { color: c.danger },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 6, color: c.primary, textAlign: 'center', paddingVertical: SPACING.sm },
  codeExpired: { color: c.textSecondary },
  expiry: { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
  expiryExpired: { color: c.danger },
  codeActions: { flexDirection: 'row', gap: SPACING.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: c.primary, fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '500', color: c.text },
  memberEmail: { fontSize: 12, color: c.textSecondary },
  role: {
    fontSize: 12, color: c.textSecondary,
    backgroundColor: c.background,
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalBox: {
    backgroundColor: c.card, borderRadius: 16,
    padding: SPACING.lg, width: '100%', gap: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.danger },
  modalHint: { fontSize: 14, color: c.textSecondary },
  modalInput: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10,
    padding: SPACING.sm, fontSize: 16, color: c.text,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: c.text, fontWeight: '500' },
  confirmBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 10,
    backgroundColor: c.danger, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: c.danger + '55' },
  confirmBtnText: { fontSize: 15, color: c.white, fontWeight: '600' },
});
