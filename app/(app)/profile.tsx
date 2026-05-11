import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openAndroidPicker } from '../../src/utils/datePicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { updateDisplayName, changePassword, updateThemePreference, updateNotificationPrefs } from '../../src/services/profile';
import { updatePresetAvatar, pickAndUploadAvatarPhoto, removeAvatar, updateAvatarColor } from '../../src/services/avatar';
import { logout } from '../../src/services/auth';
import { TextInput } from '../../src/components/ui/TextInput';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/Avatar';
import { PRESET_AVATARS, AVATAR_COLORS } from '../../src/constants/avatars';
import { Colors, SPACING } from '../../src/constants';
import { useTheme } from '../../src/hooks/useTheme';
import { ThemePreference } from '../../src/types';
import i18n from '../../src/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [displayName, setDisplayName] = useState(appUser?.displayName ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [morningHour, setMorningHour] = useState(appUser?.notificationMorningHour ?? 7);
  const [morningMinute, setMorningMinute] = useState(appUser?.notificationMorningMinute ?? 30);
  const [preEventMinutes, setPreEventMinutes] = useState(appUser?.notificationPreEventMinutes ?? 30);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [notifError, setNotifError] = useState('');

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

  async function handleSelectPreset(avatarId: string) {
    if (!appUser) return;
    setAvatarError('');
    setAvatarSuccess(false);
    setAvatarLoading(true);
    try {
      await updatePresetAvatar(avatarId, appUser.householdIds);
      setAvatarSuccess(true);
    } catch {
      setAvatarError(t('profile.avatarFailed'));
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSelectColor(colorId: string) {
    if (!appUser) return;
    setAvatarError('');
    setAvatarSuccess(false);
    setAvatarLoading(true);
    try {
      await updateAvatarColor(colorId, appUser.householdIds);
      setAvatarSuccess(true);
    } catch {
      setAvatarError(t('profile.avatarFailed'));
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleUploadPhoto() {
    if (!appUser) return;
    setAvatarError('');
    setAvatarSuccess(false);
    setAvatarLoading(true);
    try {
      const url = await pickAndUploadAvatarPhoto(appUser.householdIds);
      if (url) setAvatarSuccess(true);
    } catch (e: any) {
      setAvatarError(e?.code === 'storage/unknown'
        ? t('profile.avatarUpgradePlan')
        : t('profile.avatarFailed'));
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!appUser) return;
    setAvatarError('');
    setAvatarSuccess(false);
    setAvatarLoading(true);
    try {
      await removeAvatar(appUser.householdIds);
      setAvatarSuccess(true);
    } catch {
      setAvatarError(t('profile.avatarFailed'));
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSaveNotifPrefs() {
    setNotifError('');
    setNotifSuccess(false);
    setNotifLoading(true);
    try {
      await updateNotificationPrefs(morningHour, morningMinute, preEventMinutes);
      setNotifSuccess(true);
    } catch (e: any) {
      setNotifError(e.message ?? t('profile.notifFailed'));
    } finally {
      setNotifLoading(false);
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

  async function handleTheme(pref: ThemePreference) {
    await updateThemePreference(pref);
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
          <Avatar
            avatarId={appUser?.avatarId}
            photoURL={appUser?.photoURL}
            avatarColor={appUser?.avatarColor}
            name={appUser?.displayName ?? appUser?.email}
            size={72}
            selfHighlight
          />
          <Text style={styles.emailText}>{appUser?.email}</Text>
        </View>

        {/* Avatar picker */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t('profile.avatar')}</Text>
            {avatarLoading && <ActivityIndicator size="small" color={c.primary} />}
          </View>
          <View style={styles.emojiGrid}>
            {PRESET_AVATARS.map((a) => {
              const isActive = appUser?.avatarId === a.id && !appUser?.photoURL;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.emojiBtn, isActive && styles.emojiBtnActive]}
                  onPress={() => handleSelectPreset(a.id)}
                  disabled={avatarLoading}
                >
                  <Text style={styles.emojiText}>{a.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!appUser?.photoURL && (
            <View>
              <Text style={styles.colorLabel}>{t('profile.avatarColor')}</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((col) => {
                  const isActive = (appUser?.avatarColor ?? 'indigo') === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[styles.colorSwatch, { backgroundColor: col.bg }, isActive && styles.colorSwatchActive]}
                      onPress={() => handleSelectColor(col.id)}
                      disabled={avatarLoading}
                    />
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUploadPhoto}
            disabled={avatarLoading}
          >
            <Text style={styles.uploadBtnText}>{t('profile.uploadPhoto')}</Text>
          </TouchableOpacity>
          {(appUser?.avatarId || appUser?.photoURL) && (
            <TouchableOpacity onPress={handleRemoveAvatar} disabled={avatarLoading}>
              <Text style={styles.removeText}>{t('profile.removePhoto')}</Text>
            </TouchableOpacity>
          )}
          {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
          {avatarSuccess ? <Text style={styles.success}>{t('profile.avatarSaved')}</Text> : null}
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

        {/* Theme */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.theme')}</Text>
          <View style={styles.langRow}>
            <ThemeButton label={t('profile.themeSystem')} pref="system" current={appUser?.themePreference ?? 'system'} onPress={handleTheme} />
            <ThemeButton label={t('profile.themeLight')} pref="light" current={appUser?.themePreference ?? 'system'} onPress={handleTheme} />
            <ThemeButton label={t('profile.themeDark')} pref="dark" current={appUser?.themePreference ?? 'system'} onPress={handleTheme} />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.notifications')}</Text>
          <Text style={styles.settingLabel}>{t('profile.notifMorningTime')}</Text>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => {
              if (Platform.OS === 'android') {
                const d = new Date();
                d.setHours(morningHour, morningMinute, 0, 0);
                openAndroidPicker(d, 'time', (date) => {
                  setMorningHour(date.getHours());
                  setMorningMinute(date.getMinutes());
                }, { is24Hour: true });
              } else {
                setShowTimePicker(true);
              }
            }}
          >
            <Text style={styles.timeBtnText}>
              {String(morningHour).padStart(2, '0')}:{String(morningMinute).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && showTimePicker && (
            <DateTimePicker
              value={(() => { const d = new Date(); d.setHours(morningHour, morningMinute, 0, 0); return d; })()}
              mode="time"
              is24Hour
              display="spinner"
              textColor={c.text}
              onChange={(_, date) => {
                if (date) {
                  setMorningHour(date.getHours());
                  setMorningMinute(date.getMinutes());
                }
              }}
            />
          )}
          <Text style={[styles.settingLabel, { marginTop: SPACING.xs }]}>{t('profile.notifPreEvent')}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPreEventMinutes((m) => Math.max(5, m - 5))}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{preEventMinutes} {t('profile.notifMinutes')}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPreEventMinutes((m) => Math.min(120, m + 5))}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {notifError ? <Text style={styles.error}>{notifError}</Text> : null}
          {notifSuccess ? <Text style={styles.success}>{t('profile.notifSaved')}</Text> : null}
          <Button label={t('common.save')} onPress={handleSaveNotifPrefs} loading={notifLoading} />
        </View>

        <Button label={t('auth.logout')} onPress={handleLogout} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}

function LangButton({ label, lang, current, onPress }: {
  label: string; lang: 'de' | 'en'; current: string; onPress: (l: 'de' | 'en') => void;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
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

function ThemeButton({ label, pref, current, onPress }: {
  label: string; pref: ThemePreference; current: ThemePreference; onPress: (p: ThemePreference) => void;
}) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const active = current === pref;
  return (
    <TouchableOpacity
      style={[styles.langBtn, active && styles.langBtnActive]}
      onPress={() => onPress(pref)}
    >
      <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: c.text },
  close: { fontSize: 18, color: c.textSecondary, width: 32 },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xl * 2 },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  emailText: { fontSize: 14, color: c.textSecondary },
  card: {
    backgroundColor: c.card, borderRadius: 14, padding: SPACING.md,
    gap: SPACING.sm, borderWidth: 1, borderColor: c.border,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs,
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  emojiBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: c.background,
    borderWidth: 2, borderColor: c.border,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
  emojiText: { fontSize: 26 },
  colorLabel: {
    fontSize: 12, color: c.textSecondary, marginBottom: SPACING.xs,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  colorSwatch: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: c.white, elevation: 3, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4 },
  uploadBtn: {
    borderWidth: 1, borderColor: c.primary, borderRadius: 10,
    paddingVertical: SPACING.sm, alignItems: 'center',
  },
  uploadBtnText: { color: c.primary, fontWeight: '600', fontSize: 15 },
  removeText: { color: c.danger, fontSize: 13, textAlign: 'center' },
  error: { color: c.danger, fontSize: 13 },
  success: { color: c.success, fontSize: 13 },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: 10,
    borderWidth: 1, borderColor: c.border, alignItems: 'center',
    backgroundColor: c.card,
  },
  langBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
  langBtnText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  langBtnTextActive: { color: c.white },
  settingLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 4 },
  timeBtn: {
    borderWidth: 1, borderColor: c.border, borderRadius: 10,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start', backgroundColor: c.background,
  },
  timeBtnText: { fontSize: 20, fontWeight: '600', color: c.text, letterSpacing: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperBtnText: { fontSize: 22, fontWeight: '600', color: c.text },
  stepperValue: { fontSize: 16, fontWeight: '600', color: c.text, minWidth: 80, textAlign: 'center' },
});
