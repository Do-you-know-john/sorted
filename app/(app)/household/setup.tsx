import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/stores/authStore';
import { createHousehold, joinHousehold } from '../../../src/services/households';
import { Button } from '../../../src/components/ui/Button';
import { TextInput } from '../../../src/components/ui/TextInput';
import { COLORS, SPACING } from '../../../src/constants';
import { useDiscardGuard } from '../../../src/hooks/useDiscardGuard';
import { HOUSEHOLD_AVATARS } from '../../../src/constants/avatars';

export default function HouseholdSetupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const appUser = useAuthStore((s) => s.appUser);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('house');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isDirty = !submitted && (householdName.trim().length > 0 || inviteCode.trim().length > 0 || selectedAvatarId !== 'house');
  useDiscardGuard(isDirty);

  async function handleCreate() {
    if (!householdName.trim()) { setError(t('household.enterName')); return; }
    if (!appUser) { setError(t('household.notLoggedIn')); return; }
    setError('');
    setLoading(true);
    try {
      await createHousehold(householdName.trim(), appUser.uid, appUser.displayName ?? '', appUser.email ?? '', selectedAvatarId);
      setSubmitted(true);
      router.replace('/(app)/todos');
    } catch (e: any) {
      setError(e.message ?? t('household.createFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError(t('household.enterCode')); return; }
    if (!appUser) { setError(t('household.notLoggedIn')); return; }
    setError('');
    setLoading(true);
    try {
      await joinHousehold(inviteCode.trim(), appUser.uid, appUser.displayName ?? '', appUser.email ?? '');
      setSubmitted(true);
      router.replace('/(app)/todos');
    } catch (e: any) {
      setError(e.message ?? t('household.joinFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {navigation.canGoBack() && (
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>Sorted</Text>
          <Text style={styles.subtitle}>{t('household.setup')}</Text>

          <View style={styles.tabs}>
            <TabButton label={t('household.create')} active={tab === 'create'} onPress={() => { setTab('create'); setError(''); }} />
            <TabButton label={t('household.join')} active={tab === 'join'} onPress={() => { setTab('join'); setError(''); }} />
          </View>

          {tab === 'create' ? (
            <View style={styles.form}>
              <TextInput
                label={t('household.householdName')}
                value={householdName}
                onChangeText={setHouseholdName}
                placeholder={t('household.householdNamePlaceholder')}
              />
              <View>
                <Text style={styles.avatarLabel}>{t('household.avatar')}</Text>
                <View style={styles.emojiGrid}>
                  {HOUSEHOLD_AVATARS.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.emojiBtn, selectedAvatarId === a.id && styles.emojiBtnActive]}
                      onPress={() => setSelectedAvatarId(a.id)}
                    >
                      <Text style={styles.emojiText}>{a.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label={t('household.createHousehold')} onPress={handleCreate} loading={loading} />
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                label={t('household.inviteCode')}
                value={inviteCode}
                onChangeText={(v) => setInviteCode(v.toUpperCase())}
                placeholder={t('household.inviteCodePlaceholder')}
                autoCapitalize="characters"
                maxLength={6}
                style={{ letterSpacing: 4, fontSize: 20, textAlign: 'center' }}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label={t('household.joinHousehold')} onPress={handleJoin} loading={loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} onPress={onPress}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cancelBtn: { color: COLORS.primary, fontSize: 16 },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  logo: { fontSize: 40, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  form: { gap: SPACING.md },
  avatarLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  emojiText: { fontSize: 24 },
  error: { color: COLORS.danger, fontSize: 14 },
});
