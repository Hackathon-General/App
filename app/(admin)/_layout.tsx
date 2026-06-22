import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import { TabIcon } from '@/components/TabIcon';
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
        tabBarStyle: { backgroundColor: colors.deepGreen, borderTopColor: '#000', height: 64, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {/* Primary live-ops tabs */}
      <Tabs.Screen name="map" options={{ title: 'מפה חיה', tabBarIcon: ({ color, focused }) => <TabIcon name="map-marker-radius" color={color} focused={focused} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'התראות', tabBarIcon: ({ color, focused }) => <TabIcon name="bullhorn" color={color} focused={focused} /> }} />
      <Tabs.Screen name="nfr" options={{ title: 'משימות', tabBarIcon: ({ color, focused }) => <TabIcon name="map-marker-plus" color={color} focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'מובילים', tabBarIcon: ({ color, focused }) => <TabIcon name="trophy" color={color} focused={focused} /> }} />
      <Tabs.Screen name="manage" options={{ title: 'ניהול', tabBarIcon: ({ color, focused }) => <TabIcon name="cog" color={color} focused={focused} /> }} />

      {/* Editors reached from the ניהול hub — hidden from the tab bar */}
      <Tabs.Screen name="content" options={{ href: null }} />
      <Tabs.Screen name="event" options={{ href: null }} />
      <Tabs.Screen name="takehome" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ href: null }} />
      <Tabs.Screen name="info" options={{ href: null }} />
      <Tabs.Screen name="sos" options={{ href: null }} />
      <Tabs.Screen name="tests" options={{ href: null }} />
    </Tabs>
  );
}
