import React from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';

import { AppButton } from '@/components/ui';
import { space, typography as typeScale } from '@/constants/theme';
import { makeStyles } from '@/providers/ThemeProvider';

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    gap: space.md,
  },
  title: { ...typeScale.title, color: c.text, textAlign: 'center' },
  body: { ...typeScale.body, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
}));

export default function NotFoundScreen() {
  const styles = useStyles();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <View style={styles.root}>
        <Text style={styles.title}>This screen does not exist</Text>
        <Text style={styles.body}>
          The link you followed points somewhere Suvana does not have a page for.
        </Text>
        <AppButton
          label="Back to the dashboard"
          icon="arrow-back"
          onPress={() => router.replace('/')}
          style={{ marginTop: space.md }}
        />
      </View>
    </>
  );
}
