import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { content } from '@/content';
import type { Station } from '@/content';

const f = content.ui.stationFields;

/** Detail sheet shown when a station (התנדבות / value) marker is pressed. */
export function StationSheet({ station, onClose, onStartMission }: {
  station: Station;
  onClose: () => void;
  onStartMission?: (s: Station) => void;
}) {
  const v = valueTheme[station.value];
  const paidLabel = station.paid === 'yes' ? content.ui.yes : station.paid === 'symbolic' ? content.ui.symbolic : content.ui.no;
  const paidColor = station.paid === 'no' ? colors.success : colors.terracotta;

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Header: value chip + close */}
        <View style={styles.headerRow}>
          <View style={[styles.valueChip, { backgroundColor: v.color }]}>
            <MaterialCommunityIcons name={v.icon as never} size={14} color="#fff" />
            <Text style={styles.valueChipTxt}>{v.label}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{station.number}. {station.name}</Text>
        <Text style={styles.about}>{station.aboutPlace}</Text>

        {/* Narrative blocks */}
        <Block icon="hammer-wrench" label={f.whatYouDo} value={station.whatYouDo} />
        <Block icon="heart" label={f.tieToKarmelKinneret} value={station.tieToKarmelKinneret} />

        {/* Logistics grid */}
        <View style={styles.grid}>
          <InfoCell icon="map-marker" label={f.location} value={station.locationText} />
          <InfoCell icon="clock-outline" label={f.openingHours} value={station.openingHours} />
          <InfoCell icon="calendar-check" label={f.needsBooking} value={station.needsBooking ? content.ui.yes : content.ui.no} />
          <InfoCell icon="cash" label={f.paid} value={paidLabel} valueColor={paidColor} />
        </View>

        {/* Contact call button */}
        {!!station.contactPhone && (
          <TouchableOpacity style={styles.callBtn} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); Linking.openURL(`tel:${station.contactPhone}`); }}>
            <MaterialCommunityIcons name="phone" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.callName}>{station.contactName}</Text>
              <Text style={styles.callPhone}>{station.contactPhone}</Text>
            </View>
            <Text style={styles.callCta}>חיוג</Text>
          </TouchableOpacity>
        )}

        {onStartMission && (
          <TouchableOpacity style={[styles.cta, { backgroundColor: v.color }]} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onStartMission(station); }}>
            <MaterialCommunityIcons name="flag-checkered" size={18} color="#fff" />
            <Text style={styles.ctaTxt}>התחל משימה</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Block({ icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <MaterialCommunityIcons name={icon} size={15} color={colors.terracotta} />
        <Text style={styles.blockLabel}>{label}</Text>
      </View>
      <Text style={styles.blockValue}>{value}</Text>
    </View>
  );
}

function InfoCell({ icon, label, value, valueColor }: { icon: any; label: string; value: string; valueColor?: string }) {
  if (!value || value === '-') return null;
  return (
    <View style={styles.cell}>
      <View style={styles.cellHead}>
        <MaterialCommunityIcons name={icon} size={14} color={colors.muted} />
        <Text style={styles.cellLabel}>{label}</Text>
      </View>
      <Text style={[styles.cellValue, valueColor && { color: valueColor }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, direction: 'rtl' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  valueChipTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: spacing.md, textAlign: 'right', writingDirection: 'rtl' },
  about: { fontSize: 15, color: colors.muted, marginTop: spacing.xs, textAlign: 'right', writingDirection: 'rtl', lineHeight: 21 },
  block: { marginTop: spacing.lg },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockLabel: { fontSize: 13, fontWeight: '800', color: colors.terracotta, writingDirection: 'rtl' },
  blockValue: { fontSize: 15, color: colors.ink, textAlign: 'right', marginTop: 4, writingDirection: 'rtl', lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, direction: 'rtl' },
  cell: { width: '47%', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cellLabel: { fontSize: 12, color: colors.muted, fontWeight: '700', writingDirection: 'rtl' },
  cellValue: { fontSize: 14, color: colors.ink, fontWeight: '700', textAlign: 'right', marginTop: 4, writingDirection: 'rtl' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.forest, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  callName: { color: '#fff', fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  callPhone: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'right' },
  callCta: { color: '#fff', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  cta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: spacing.lg, paddingVertical: 15, borderRadius: radius.pill },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
