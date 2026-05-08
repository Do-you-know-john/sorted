import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { register } from '../../src/services/auth';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { COLORS, SPACING } from '../../src/constants';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!displayName || !email || !password) { setError(t('auth.fillAllFields')); return; }
    if (password.length < 6) { setError(t('auth.passwordMinLength')); return; }
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
    } catch (e: any) {
      setError(e.message ?? t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Sorted</Text>
        <Text style={styles.tagline}>{t('auth.taglineRegister')}</Text>

        <View style={styles.form}>
          <TextInput label={t('auth.name')} value={displayName} onChangeText={setDisplayName} placeholder={t('auth.namePlaceholder')} />
          <TextInput
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('auth.emailPlaceholder')}
          />
          <TextInput
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('auth.passwordMin')}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('auth.register')} onPress={handleRegister} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>{t('auth.hasAccount')} <Text style={styles.linkBold}>{t('auth.login')}</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  logo: { fontSize: 40, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  tagline: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: -SPACING.sm },
  form: { gap: SPACING.md },
  error: { color: COLORS.danger, fontSize: 14 },
  link: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
