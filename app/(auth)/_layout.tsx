import React from 'react';
import { Stack } from 'expo-router';

/** Auth group — single stack (login). Having this layout makes "(auth)" a valid Stack.Screen name. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
