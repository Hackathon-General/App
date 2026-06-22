import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useTrailServices } from '@/location/useTrailServices';

export default function UserLayout() {
  useTrailServices();
  return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.forest,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'מפה', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="stations"
          options={{ title: 'תחנות', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="feed"
          options={{ title: 'קהילה', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="image-multiple" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="torch"
          options={{ title: 'הלפיד', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="torch" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="event"
          options={{ title: 'המרוץ', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="run" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'פרופיל', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} /> }}
        />
        {/* Routes reached via navigation — hidden from the tab bar */}
        <Tabs.Screen name="station/[id]" options={{ href: null }} />
        <Tabs.Screen name="contact" options={{ href: null }} />
        <Tabs.Screen name="about" options={{ href: null }} />
        <Tabs.Screen name="info" options={{ href: null }} />
      </Tabs>
  );
}
