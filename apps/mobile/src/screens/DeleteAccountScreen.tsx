import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ActAppShell from '../components/ActAppShell';
import { deleteAccount } from '../api/captureApi';
import { useAuthSession } from '../hooks/useAuthSession';
import type { PilotStackParamList } from '../navigation/PilotNavigator';
import { ActButton, ActCard, ActInput, ActScreen, ActText, spacing } from '../design';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountScreen() {
  const navigation = useNavigation<NavProp>();
  const { signOut } = useAuthSession();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut();
      // The auth gate swaps to LoginScreen on its own once the session clears.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'account deletion failed');
      setLoading(false);
    }
  }

  return (
    <ActAppShell
      mode="Delete account"
      onMenuPress={() =>
        navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PilotHome')
      }
    >
      <ActScreen>
        <ActText variant="display">Delete your account</ActText>

        <ActCard tone="err" accent="err">
          <ActText variant="bodyStrong" color="ink">
            This removes your login and personal info. It does not delete your work.
          </ActText>
          <ActText variant="small" color="steel700" style={{ marginTop: spacing.xs }}>
            Any recordings, marked moments, and training cards you captured stay with your
            company — that&apos;s the whole point of ACT. Your name and email are removed from
            them; the content itself isn&apos;t deleted.
          </ActText>
        </ActCard>

        <ActCard>
          <ActText variant="label" color="textMuted">
            This can&apos;t be undone
          </ActText>
          <ActText variant="small" color="textMuted" style={{ marginTop: spacing.xs }}>
            Type {CONFIRM_WORD} to confirm.
          </ActText>
          <View style={{ marginTop: spacing.sm }}>
            <ActInput
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={CONFIRM_WORD}
            />
          </View>
        </ActCard>

        {error ? (
          <ActText variant="small" color="error">
            {error}
          </ActText>
        ) : null}

        <ActButton
          label="Delete my account"
          variant="danger"
          disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD || loading}
          loading={loading}
          onPress={() => void handleDelete()}
        />
      </ActScreen>
    </ActAppShell>
  );
}
