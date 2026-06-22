import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { TabIcon } from '@/components/TabIcon';
import { useTrailServices } from '@/location/useTrailServices';
import { useGeofenceMission } from '@/features/missions/useGeofenceMission';
import { NfrMissionModal } from '@/components/NfrMissionModal';

export default function UserLayout() {
  useTrailServices();
  const insets = useSafeAreaInsets();
  const { active, dismiss } = useGeofenceMission();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.forest,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 60 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) } as any,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'מפה', tabBarIcon: ({ color, focused }) => <TabIcon name="map" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="stations"
          options={{ title: 'תחנות', tabBarIcon: ({ color, focused }) => <TabIcon name="format-list-bulleted" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="feed"
          options={{ title: 'קהילה', tabBarIcon: ({ color, focused }) => <TabIcon name="image-multiple" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="torch"
          options={{ title: 'הלפיד', tabBarIcon: ({ color, focused }) => <TabIcon name="torch" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="event"
          options={{ title: 'המרוץ', tabBarIcon: ({ color, focused }) => <TabIcon name="run" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'פרופיל', tabBarIcon: ({ color, focused }) => <TabIcon name="account" color={color} focused={focused} /> }}
        />
        {/* Routes reached via navigation — hidden from the tab bar */}
        <Tabs.Screen name="station/[id]" options={{ href: null }} />
        <Tabs.Screen name="contact" options={{ href: null }} />
        <Tabs.Screen name="about" options={{ href: null }} />
        <Tabs.Screen name="info" options={{ href: null }} />
      </Tabs>
      {/* Geofence mission — blocking pop-up when reaching a values station (active NFR). */}
      <NfrMissionModal station={active} onClose={dismiss} />
    </>
  );
}
