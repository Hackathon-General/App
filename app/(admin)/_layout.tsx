import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import { useAuth } from '@/auth/AuthProvider';

/** Admin God-Mode — gated on the custom claim. Non-admins are redirected. */
export default function AdminLayout() {
  const { role, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.forest} />
      </View>
    );
  }
  if (role !== 'admin') {
    return <Redirect href="/(user)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.terracotta,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.deepGreen, borderTopColor: '#000' },
      }}
    >
      <Tabs.Screen name="map" options={{ title: 'מפה חיה', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} /> }} />
      <Tabs.Screen name="nfr" options={{ title: 'משימות', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-plus" color={color} size={size} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'התראות', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bullhorn" color={color} size={size} /> }} />
      <Tabs.Screen name="content" options={{ title: 'תוכן', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="file-document-edit" color={color} size={size} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'מובילים', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="trophy" color={color} size={size} /> }} />
      <Tabs.Screen name="tests" options={{ title: 'בדיקות', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="test-tube" color={color} size={size} /> }} />
    </Tabs>
  );
}
