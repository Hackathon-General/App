import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';

/** Consistent gradient header for every admin God-Mode screen. */
export function AdminHeader({ title, subtitle, icon, right }: {
  title: string;
  subtitle?: string;
  icon: any;
  right?: React.ReactNode;
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
});

export const adminBadge = StyleSheet.create({
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
