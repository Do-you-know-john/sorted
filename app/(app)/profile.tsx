import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { updateDisplayName, changePassword } from '../../src/services/profile';
import { logout } from '../../src/services/auth';
import { TextInput } from '../../src/components/ui/TextInput';
import { Button } from '../../src/components/ui/Button';
import { COLORS, SPACING } from '../../src/constants';
import i18n from '../../src/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);

  const [displayName, setDisplayName] = useState(appUser?.displayName ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setNameError('');
    setNameSuccess(false);
    setNameLoading(true);
    try {
      await updateDisplayName(displayName.trim());
      setNameSuccess(true);
    } catch (e: any) {
      setNameError(e.message ?? t('profile.nameFailed'));
    } finally {
      setNameLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) { setPwError(t('auth.passwordMinLength')); return; }
    setPwError('');
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      setPwError(e.message ?? t('profile.passwordFailed'));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  }

  function handleLanguage(lang: 'de' | 'en') {
    i18n.changeLanguage(lang);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(appUser?.displayName ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.emailText}>{appUser?.email}</Text>
        </View>

        {/* Display Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.changeName')}</Text>
          <TextInput
            label={t('profile.displayName')}
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); setNameSuccess(false); }}
          />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          {nameSuccess ? <Text style={styles.success}>{t('profile.nameSaved')}</Text> : null}
          <Button label={t('common.save')} onPress={handleSaveName} loading={nameLoading} />
        </View>

        {/* Password */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.changePassword')}</Text>
          <TextInput
            label={t('profile.currentPassword')}
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); setPwSuccess(false); }}
            secureTextEntry
            placeholder="••••••••"
          />
          <TextInput
            label={t('profile.newPassword')}
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setPwSuccess(false); }}
            secureTextEntry
            placeholder={t('auth.passwordMin')}
          />
          {pwError ? <Text style={styles.error}>{pwError}</Text> : null}
          {pwSuccess ? <Text style={styles.success}>{t('profile.passwordSaved')}</Text> : null}
          <Button label={t('common.save')} onPress={handleChangePassword} loading={pwLoading} />
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.language')}</Text>
          <View style={styles.langRow}>
            <LangButton label="Deutsch" lang="de" current={i18n.language} onPress={handleLanguage} />
            <LangButton label="English" lang="en" current={i18n.language} onPress={handleLanguage} />
          </View>
        </View>

        <Button label={t('auth.logout')} onPress={handleLogout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

function LangButton({ label, lang, current, onPress }: {
  label: string; lang: 'de' | 'en'; current: string; onPress: (l: 'de' | 'en') => void;
}) {
  const active = current === lang;
  return (
    <TouchableOpacity
      style={[styles.langBtn, active && styles.langBtnActive]}
      onPress={() => onPress(lang)}
    >
      <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  close: { fontSize: 18, color: COLORS.textSecondary, width: 32 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: COLORS.primary },
  emailText: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: SPACING.md,
    gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs,
  },
  error: { color: COLORS.danger, fontSize: 13 },
  success: { color: COLORS.success, fontSize: 13 },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  langBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  langBtnTextActive: { color: COLORS.white },
});
