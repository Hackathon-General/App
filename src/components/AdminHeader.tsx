import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';

/** Consistent gradient header for every admin God-Mode screen. */
export function AdminHeader({ title, subtitle, icon, right, showBackToApp = true }: {
  title: string;
  subtitle?: string;
  icon: any;
  right?: React.ReactNode;
  showBackToApp?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[colors.deepGreen, colors.forest]} style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right}
        {showBackToApp && (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(user)')} hitSlop={8}>
            <MaterialCommunityIcons name="exit-to-app" size={18} color="#fff" />
            <Text style={styles.backTxt}>לאפליקציה</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, direction: 'rtl' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  backTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

export const adminBadge = StyleSheet.create({
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
