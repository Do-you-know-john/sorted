import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share, Modal, TextInput as RNTextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/stores/authStore';
import { useHouseholdStore } from '../../../src/stores/householdStore';
import { refreshInviteCode, getTodoCount, deleteHousehold } from '../../../src/services/households';
import { logout } from '../../../src/services/auth';
import { Button } from '../../../src/components/ui/Button';
import { COLORS, SPACING } from '../../../src/constants';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import i18n from '../../../src/i18n';

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const household = useHouseholdStore((s) => s.household);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const members = household ? Object.values(household.members) : [];
  const isAdmin = household?.members[appUser?.uid ?? '']?.role === 'admin';
  const codeExpiry = household?.inviteCodeExpiresAt?.toDate();
  const codeExpired = codeExpiry ? codeExpiry < new Date() : false;
  const dateLocale = i18n.language === 'de' ? de : enUS;

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
        router.replace('/(app)/(home)');
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.householdName}>{household?.name ?? ''}</Text>

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
              placeholderTextColor={COLORS.textSecondary}
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
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.confirmBtnText}>{t('household.deleteBtn')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  householdName: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerCard: { borderColor: COLORS.danger + '44' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerTitle: { color: COLORS.danger },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 6, color: COLORS.primary, textAlign: 'center', paddingVertical: SPACING.sm },
  codeExpired: { color: COLORS.textSecondary },
  expiry: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  expiryExpired: { color: COLORS.danger },
  codeActions: { flexDirection: 'row', gap: SPACING.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  memberEmail: { fontSize: 12, color: COLORS.textSecondary },
  role: {
    fontSize: 12, color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: 8,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalBox: {
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: SPACING.lg, width: '100%', gap: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.danger },
  modalHint: { fontSize: 14, color: COLORS.textSecondary },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: SPACING.sm, fontSize: 16, color: COLORS.text,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  confirmBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 10,
    backgroundColor: COLORS.danger, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: COLORS.danger + '55' },
  confirmBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
});
