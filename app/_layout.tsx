import React, { useEffect } from 'react';
import { I18nManager, DevSettings } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ContentProvider } from '@/content/ContentProvider';
import { colors } from '@/theme';
import '@/notifications/notifications'; // registers the foreground notification handler app-wide

// Force RTL for the Hebrew app. forceRTL only takes effect after a reload, so if the app
// launched LTR, set the flag and reload ONCE so the whole native layout flips to RTL.
I18nManager.allowRTL(true);
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  if (__DEV__ && DevSettings?.reload) {
    setTimeout(() => DevSettings.reload(), 0);
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

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
