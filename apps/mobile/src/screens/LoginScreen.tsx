/**
 * LoginScreen — the invite-only pilot gate.
 *
 * Rendered by PilotNavigator whenever Supabase is configured and there's no
 * session yet (see lib/supabase.ts / hooks/useAuthSession.ts). There is no
 * sign-up path here on purpose — accounts are provisioned by an ACT admin
 * (Supabase invite), not self-serve.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { useAuthSession } from '../hooks/useAuthSession';
import { canSubmitLogin } from './loginScreenModel';
import { ActButton, ActCard, ActInput, ActScreen, ActText, colors, spacing } from '../design';

export default function LoginScreen() {
  const { signInWithPassword } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = canSubmitLogin({ email, password, submitting });

  async function handleSignIn() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    if (signInError) {
      setError(signInError);
      setSubmitting(false);
    }
    // On success, useAuthSession's onAuthStateChange fires and PilotNavigator
    // swaps to the pilot stack — nothing further to do here.
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ActScreen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ActText variant="label" color="primary" style={styles.wordmark}>
            ACT
          </ActText>
          <ActText variant="display">
            Capture senior tech knowledge before it walks out the door.
          </ActText>
        </View>

        <ActCard style={styles.form}>
          <ActInput
            label="Work email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!submitting}
          />
          <ActInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            editable={!submitting}
            onSubmitEditing={handleSignIn}
          />
        </ActCard>

        {error ? (
          <ActCard tone="err" accent="err">
            <ActText variant="small" color="error" weight="semibold">
              {error}
            </ActText>
          </ActCard>
        ) : null}

        <ActButton
          label={submitting ? 'Signing in' : 'Sign in'}
          onPress={() => void handleSignIn()}
          disabled={!canSubmit}
          loading={submitting}
        />

        <ActText variant="label" color="textMuted" style={styles.footer}>
          Private pilot access only
        </ActText>
      </ActScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center' },
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  wordmark: { fontSize: 13, letterSpacing: 2 },
  form: { gap: spacing.lg },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
