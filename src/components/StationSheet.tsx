import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
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

  return (
    <View style={styles.sheet}>
      <View style={[styles.handle]} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.headerRow}>
          <View style={[styles.valueChip, { backgroundColor: v.color }]}>
            <Text style={styles.valueChipTxt}>{v.label}</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
        </View>

        <Text style={styles.title}>{station.number}. {station.name}</Text>
        <Text style={styles.about}>{station.aboutPlace}</Text>

        <Field label={f.whatYouDo} value={station.whatYouDo} />
        <Field label={f.tieToKarmelKinneret} value={station.tieToKarmelKinneret} />
        <Field label={f.location} value={station.locationText} />
        <Field label={f.openingHours} value={station.openingHours} />
        <Field label={f.needsBooking} value={station.needsBooking ? content.ui.yes : content.ui.no} />
        <Field label={f.paid} value={paidLabel} />

        {!!station.contactPhone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${station.contactPhone}`)}>
            <Text style={styles.contact}>{f.contact}: {station.contactName} — {station.contactPhone}</Text>
          </TouchableOpacity>
        )}

        {onStartMission && (
          <TouchableOpacity style={[styles.cta, { backgroundColor: v.color }]} onPress={() => onStartMission(station)}>
            <Text style={styles.ctaTxt}>התחל משימה</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '-') return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '75%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  valueChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  valueChipTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  close: { fontSize: 20, color: colors.muted },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: spacing.sm, textAlign: 'right' },
  about: { fontSize: 15, color: colors.muted, marginTop: spacing.xs, textAlign: 'right' },
  field: { marginTop: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.terracotta, textAlign: 'right' },
  fieldValue: { fontSize: 15, color: colors.ink, textAlign: 'right', marginTop: 2 },
  contact: { fontSize: 15, color: colors.forest, fontWeight: '700', marginTop: spacing.md, textAlign: 'right' },
  cta: { marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center' },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
