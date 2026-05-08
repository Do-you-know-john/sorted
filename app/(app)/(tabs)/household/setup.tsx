import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../../src/stores/authStore';
import { createHousehold, joinHousehold } from '../../../../src/services/households';
import { Button } from '../../../../src/components/ui/Button';
import { TextInput } from '../../../../src/components/ui/TextInput';
import { Colors, SPACING } from '../../../../src/constants';
import { useTheme } from '../../../../src/hooks/useTheme';
import { useDiscardGuard } from '../../../../src/hooks/useDiscardGuard';
import { HOUSEHOLD_AVATARS } from '../../../../src/constants/avatars';
import { HouseholdIcon } from '../../../../src/components/HouseholdIcon';

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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

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
      router.replace('/(app)/(tabs)/todos');
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
      router.replace('/(app)/(tabs)/todos');
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
                      <HouseholdIcon avatarId={a.id} size={36} />
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
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} onPress={onPress}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  cancelBtn: { color: c.primary, fontSize: 16 },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  logo: { fontSize: 40, fontWeight: '800', color: c.primary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: c.textSecondary, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center' },
  tabActive: { backgroundColor: c.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  tabTextActive: { color: c.white },
  form: { gap: SPACING.md },
  avatarLabel: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: SPACING.xs },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiBtn: {
    borderRadius: 14, borderWidth: 2, borderColor: 'transparent',
    padding: 3,
  },
  emojiBtnActive: { borderColor: c.primary },
  error: { color: c.danger, fontSize: 14 },
});
