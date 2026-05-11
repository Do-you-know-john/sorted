import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { login } from '../../src/services/auth';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { Colors, SPACING } from '../../src/constants';
import { useTheme } from '../../src/hooks/useTheme';

const makeStyles = (c: Colors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  logo: { fontSize: 40, fontWeight: '800', color: c.primary, textAlign: 'center' },
  tagline: { fontSize: 16, color: c.textSecondary, textAlign: 'center', marginTop: -SPACING.sm },
  form: { gap: SPACING.md },
  error: { color: c.danger, fontSize: 14 },
  link: { textAlign: 'center', color: c.textSecondary, fontSize: 14 },
  linkBold: { color: c.primary, fontWeight: '600' },
  showToggle: { fontSize: 13, fontWeight: '600' },
});

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  async function handleLogin() {
    if (!email || !password) { setError(t('auth.fillAllFields')); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Sorted</Text>
        <Text style={styles.tagline}>{t('auth.taglineLogin')}</Text>

        <View style={styles.form}>
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
            secureTextEntry={!showPassword}
            placeholder={t('auth.passwordPlaceholder')}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Text style={[styles.showToggle, { color: c.primary }]}>
                  {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                </Text>
              </TouchableOpacity>
            }
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('auth.login')} onPress={handleLogin} loading={loading} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>{t('auth.noAccount')} <Text style={styles.linkBold}>{t('auth.register')}</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
