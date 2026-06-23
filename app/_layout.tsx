import React, { useEffect } from 'react';
import { I18nManager, DevSettings, View, Text, ScrollView } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ContentProvider } from '@/content/ContentProvider';
import { colors } from '@/theme';
import '@/notifications/notifications'; // registers the foreground notification handler app-wide

// Force RTL for the Hebrew app. Wrapped in try/catch so a native quirk here can NEVER crash
// startup. DevSettings.reload() is DEV-only (it doesn't exist in a release APK → would crash).
try {
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
    if (__DEV__ && typeof DevSettings?.reload === 'function') {
      setTimeout(() => { try { DevSettings.reload(); } catch {} }, 0);
    }
    // In production the flag applies on the NEXT launch — no reload call, no crash.
  }
} catch (e) {
  console.warn('[rtl] forceRTL failed (non-fatal):', e);
}

try { SplashScreen.preventAutoHideAsync().catch(() => {}); } catch {}

// Expo Router catches any render error app-wide and renders this instead of a white-screen crash.
// On a release APK this turns an invisible crash into a readable message.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink, textAlign: 'center', marginBottom: 12 }}>אופס — משהו נכשל</Text>
      <ScrollView style={{ maxHeight: 240, backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
        <Text selectable style={{ color: colors.danger, fontSize: 13 }}>{error?.name}: {error?.message}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>{error?.stack}</Text>
      </ScrollView>
      <Text onPress={retry} style={{ color: '#fff', backgroundColor: colors.forest, textAlign: 'center', fontWeight: '800', paddingVertical: 14, borderRadius: 999, marginTop: 16, overflow: 'hidden' }}>נסה שוב</Text>
    </View>
  );
}

function RootNavigator() {
  const { user, role, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    SplashScreen.hideAsync().catch(() => {});

    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace(role === 'admin' ? '/(admin)/map' : '/(user)');
    }
  }, [user, role, initializing, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(user)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ContentProvider>
            <RootNavigator />
          </ContentProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
