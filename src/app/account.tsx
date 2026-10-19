import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Txt, haptic } from '@/components/ui';
import { loadProfile, logIn, resetPassword, settingsFromProfile, signUp } from '@/services/account';
import { supabase } from '@/services/supabase';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Txt variant="caption">{label}</Txt>
      <TextInput placeholderTextColor={colors.textFaint} style={styles.input} accessibilityLabel={label} {...props} />
    </View>
  );
}

/** Create an account or log in. During onboarding it continues to news topics; from Settings it just closes. */
export default function Account() {
  const params = useLocalSearchParams<{ mode?: string; onboarding?: string }>();
  const onboarding = params.onboarding === '1';
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const { data, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(data.settings.profile.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const signup = mode === 'signup';
  const valid = EMAIL.test(email.trim()) && password.length >= 6 && (!signup || name.trim().length > 0);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const next = () => {
    if (onboarding) router.replace({ pathname: '/interests', params: { first: '1' } });
    else close();
  };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (signup) {
        updateSettings({ profile: { ...data.settings.profile, name: name.trim() } });
        const { needsConfirmation } = await signUp(name, email, password);
        haptic('success');
        if (needsConfirmation) setConfirmSent(true);
        else next();
      } else {
        await logIn(email, password);
        haptic('success');
        // Bring back what the account already has, and skip the steps it's already done.
        const { data: user } = await supabase.auth.getUser();
        const profile = user.user ? await loadProfile(user.user.id).catch(() => null) : null;
        if (profile) updateSettings(settingsFromProfile(profile, data.settings));
        if (onboarding && profile && profile.news_topics.length > 0 && profile.goals.length > 0) {
          updateSettings({ onboarded: true });
          if (router.canDismiss()) router.dismissAll();
          else router.replace('/');
        } else next();
      }
    } catch (e) {
      haptic('error');
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!EMAIL.test(email.trim())) {
      setError('Type your email above first, then tap “Forgot password?” again.');
      return;
    }
    try {
      await resetPassword(email);
      setInfo(`We sent a link to reset your password to ${email.trim()}.`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the email.');
    }
  };

  if (confirmSent) {
    return (
      <View style={[styles.screen, styles.confirm, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.confirmTop}>
          <Ionicons name="mail-unread-outline" size={44} color={colors.text} />
          <Text style={styles.title}>Check your email</Text>
          <Txt variant="muted">{`We sent a link to ${email.trim()}. Open it to confirm your account, then log in from Settings. Your setup on this phone is kept.`}</Txt>
        </View>
        <Button title={onboarding ? 'Continue setting up' : 'Done'} onPress={next} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">{signup ? 'Create your account' : 'Welcome back'}</Text>
        <Txt variant="muted">{signup ? 'Your profile, news topics and goals are saved to your account.' : 'Log in to bring back your profile, news and goals.'}</Txt>

        {signup ? <Field label="Name" value={name} onChangeText={setName} placeholder="Your first name" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" maxLength={60} returnKeyType="next" /> : null}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" />
        <View style={styles.field}>
          <Txt variant="caption">Password</Txt>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={signup ? 'At least 6 characters' : 'Your password'}
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType={signup ? 'newPassword' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
              returnKeyType="go"
              style={[styles.input, styles.flex]}
              accessibilityLabel="Password"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} style={styles.eye}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.error} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Txt variant="caption" style={styles.errorText}>{error}</Txt>
          </View>
        ) : null}
        {info ? <Txt variant="caption" accessibilityLiveRegion="polite">{info}</Txt> : null}

        <Button title={busy ? 'One moment…' : signup ? 'Create account' : 'Log in'} onPress={submit} disabled={!valid || busy} style={styles.submit} />
        {!signup ? (
          <Pressable onPress={forgot} hitSlop={8} accessibilityRole="button" style={styles.link}>
            <Txt variant="muted">Forgot password?</Txt>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            setMode(signup ? 'login' : 'signup');
            setError(null);
            setInfo(null);
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.link}
        >
          <Txt variant="muted">{signup ? 'Already have an account? ' : 'New to Ryz? '}<Text style={styles.linkStrong}>{signup ? 'Log in' : 'Create an account'}</Text></Txt>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: space.md },
  back: { width: 44, height: 44, justifyContent: 'center' },
  content: { paddingHorizontal: space.xl, gap: space.lg },
  title: { fontSize: 40, lineHeight: 46, fontFamily: FONT.display, color: colors.text },
  field: { gap: space.xs },
  input: { height: 52, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontSize: 17, fontFamily: FONT.regular, color: colors.text },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.surface },
  eye: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  errorText: { flex: 1, color: colors.text },
  submit: { marginTop: space.sm },
  link: { alignSelf: 'center', paddingVertical: space.xs },
  linkStrong: { color: colors.text, fontFamily: FONT.medium },
  confirm: { paddingHorizontal: space.xl, justifyContent: 'space-between' },
  confirmTop: { gap: space.lg },
});
