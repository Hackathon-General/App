import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { events, content } from '@/content';

const IMAGES: Record<string, any> = {
  'walk.jpg': require('../../assets/brand/walk.jpg'),
  'relay.jpg': require('../../assets/brand/relay.jpg'),
  'ultra.jpg': require('../../assets/brand/ultra.jpg'),
};

export default function EventScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{events.categories ? content.race.name : ''}</Text>
      <Text style={styles.headline}>{content.race.headline}</Text>
      <Text style={styles.notice}>{content.race.registrationStatus}</Text>

      {events.categories.map((c: any) => (
        <View key={c.id} style={styles.card}>
          {IMAGES[c.image] && <Image source={IMAGES[c.image]} style={styles.img} contentFit="cover" />}
          <View style={styles.body}>
            <Text style={styles.cardTitle}>{c.name}</Text>
            <Text style={styles.cardDesc}>{c.description}</Text>
            {c.routes?.map((r: any) => (
              <Text key={r.name} style={styles.line}>• {r.name} — {r.km} ק"מ ({r.start} → {r.finish})</Text>
            ))}
            {c.legs?.map((l: any) => (
              <Text key={l.n} style={styles.line}>{l.n}. {l.from} → {l.to} ({l.km} ק"מ)</Text>
            ))}
            {c.subRaces?.map((s: any) => (
              <Text key={s.name} style={styles.line}>• {s.name} — {s.km} ק"מ, זינוק {s.startTime}, ₪{s.price}</Text>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.donate} onPress={() => Linking.openURL(events.links.donate)}>
          <Text style={styles.donateTxt}>{content.actions.donate}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wa} onPress={() => Linking.openURL(`https://wa.me/${events.links.whatsapp}`)}>
          <Text style={styles.waTxt}>{content.actions.contact}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>{content.footer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md, direction: 'rtl' },
  title: { fontSize: 24, fontWeight: '900', color: colors.forest, textAlign: 'center' },
  headline: { fontSize: 16, color: colors.ink, textAlign: 'center', marginTop: 4 },
  notice: { fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: spacing.sm, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden', marginTop: spacing.md, elevation: 2 },
  img: { width: '100%', height: 150 },
  body: { padding: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.terracotta, textAlign: 'right' },
  cardDesc: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'right' },
  line: { fontSize: 14, color: colors.ink, marginTop: 4, textAlign: 'right' },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  donate: { backgroundColor: colors.terracotta, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  donateTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  wa: { borderWidth: 1.5, borderColor: colors.forest, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  waTxt: { color: colors.forest, fontWeight: '800', fontSize: 16 },
  footer: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl, fontSize: 12 },
});
