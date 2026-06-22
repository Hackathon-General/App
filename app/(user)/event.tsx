import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { content } from '@/content';
import { useContent } from '@/content/ContentProvider';

const openWaze = (lat?: number, lng?: number) => {
  if (lat == null || lng == null) return;
  Haptics.selectionAsync().catch(() => {});
  Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
};

const IMAGES: Record<string, any> = {
  'walk.jpg': require('../../assets/brand/walk.jpg'),
  'relay.jpg': require('../../assets/brand/relay.jpg'),
  'ultra.jpg': require('../../assets/brand/ultra.jpg'),
};

const ICONS: Record<string, any> = { walk: 'walk', relay: 'flag-checkered', ultra: 'run-fast' };

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}

export default function EventScreen() {
  const insets = useSafeAreaInsets();
  const { events } = useContent();
  const days = daysUntil(events.eventDate);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <LinearGradient colors={[colors.forest, colors.deepGreen]} style={StyleSheet.absoluteFill} />
          <Text style={styles.heroTitle}>{content.race.name}</Text>
          <Text style={styles.heroSub}>{content.race.subtitle}</Text>
          <Text style={styles.heroHeadline}>{content.race.headline}</Text>
          <View style={styles.heroStats}>
            <HeroStat num={`${days}`} label="ימים לאירוע" />
            <View style={styles.heroDivider} />
            <HeroStat num={new Date(events.eventDate).toLocaleDateString('he-IL')} label="תאריך" />
            <View style={styles.heroDivider} />
            <HeroStat num={events.finishArea?.name ?? 'חוף צמח'} label="קו הסיום" />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusTxt}>{content.race.registrationStatus}</Text>
          </View>
        </View>

        <View style={styles.noticeRow}>
          <MaterialCommunityIcons name="alert" size={15} color={colors.danger} />
          <Text style={styles.notice}>{content.race.notice}</Text>
        </View>

        {/* Category cards */}
        {events.categories.map((c: any, i: number) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(i * 80).duration(350)} style={styles.card}>
            <View style={styles.imgWrap}>
              {IMAGES[c.image] && <Image source={IMAGES[c.image]} style={styles.img} contentFit="cover" />}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.imgOverlay} />
              <View style={styles.imgBadge}>
                <MaterialCommunityIcons name={ICONS[c.id] ?? 'run'} size={16} color="#fff" />
                <Text style={styles.imgBadgeTxt}>{c.name}</Text>
              </View>
            </View>
            <View style={styles.body}>
              {!!c.registrationStatus && (
                <View style={styles.catStatus}><MaterialCommunityIcons name="information-outline" size={13} color={colors.terracotta} /><Text style={styles.catStatusTxt}>{c.registrationStatus}</Text></View>
              )}
              <Text style={styles.cardDesc}>{c.description}</Text>
              {!!c.requirement && <View style={styles.reqRow}><MaterialCommunityIcons name="alert-decagram" size={14} color={colors.gold} /><Text style={styles.reqTxt}>{c.requirement}</Text></View>}

              {/* Walk routes */}
              {c.routes?.map((r: any) => (
                <View key={r.name}>
                  <DetailRow icon="map-marker-distance" title={r.name}
                    detail={`${r.km} ק"מ · ${r.start} ← ${r.finish}`} extra={r.busDeparture ? `הסעה ${r.busDeparture}` : undefined} />
                  <FileLinks files={r} />
                </View>
              ))}
              {/* Relay legs */}
              {c.legs?.map((l: any) => (
                <View key={l.n}>
                  <DetailRow icon="flag" title={`מקטע ${l.n}: ${l.from} ← ${l.to}`}
                    detail={`${l.km} ק"מ${l.gain != null ? ` · טיפוס +${l.gain}מ׳` : ''}${l.loss != null ? ` · ירידה ${l.loss}מ׳` : ''}`}
                    extra={`${l.km} ק"מ`} />
                  <FileLinks files={l} />
                </View>
              ))}
              {/* Ultra subraces */}
              {c.subRaces?.map((s: any) => (
                <View key={s.name}>
                  <DetailRow icon="run-fast" title={s.name}
                    detail={`${s.km} ק"מ · זינוק ${s.startTime ?? ''}${s.gain != null ? ` · +${s.gain}מ׳` : ''}${s.cutoff ? ` · ניתוק ${s.cutoff}` : ''}`}
                    extra={s.price ? `₪${s.price}` : undefined} />
                  <FileLinks files={s} />
                </View>
              ))}
              {/* Teams (relay) — chips + descriptions */}
              {c.teams && (<>
                <View style={styles.teamRow}>
                  {c.teams.map((t: any) => (
                    <View key={t.name} style={styles.teamChip}>
                      <Text style={styles.teamName}>{t.name}</Text>
                      <Text style={styles.teamSub}>{t.runners} רצים</Text>
                      <Text style={styles.teamPrice}>₪{t.pricePerPerson}</Text>
                    </View>
                  ))}
                </View>
                {c.teams.filter((t: any) => t.description).map((t: any) => (
                  <View key={`d-${t.name}`} style={styles.teamDesc}>
                    <Text style={styles.teamDescTitle}>{t.name}</Text>
                    <Text style={styles.teamDescBody}>{t.description}</Text>
                  </View>
                ))}
              </>)}
              {!!c.perks && <View style={styles.perks}><MaterialCommunityIcons name="star-circle" size={15} color={colors.gold} /><Text style={styles.perksTxt}>{c.perks}</Text></View>}

              {/* Water stations */}
              {c.waterStations?.length > 0 && (
                <View style={styles.water}>
                  <View style={styles.waterHead}><MaterialCommunityIcons name="water" size={15} color={colors.sky} /><Text style={styles.waterTitle}>תחנות מים ({c.waterStations.length})</Text></View>
                  {c.waterStations.map((w: any, wi: number) => (
                    <TouchableOpacity key={wi} style={styles.waterRow} disabled={w.lat == null} onPress={() => openWaze(w.lat, w.lng)} activeOpacity={0.7}>
                      <Text style={styles.waterKm}>{w.km != null ? `${w.km} ק"מ` : ''}</Text>
                      <Text style={styles.waterName}>{w.name}</Text>
                      {w.lat != null && <MaterialCommunityIcons name="navigation-variant" size={16} color={colors.sky} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        ))}

        {/* Schedule */}
        <Text style={styles.sectionH}>לוח זמנים</Text>
        <View style={styles.card}>
          <View style={styles.body}>
            {events.schedule?.map((e: any, i: number) => (
              <View key={i} style={styles.schedRow}>
                <Text style={styles.schedTime}>{e.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schedEvent}>{e.event}</Text>
                  <Text style={styles.schedFrom}>{e.from}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Community quick links */}
        <View style={styles.quickGrid}>
          <QuickLink icon="hand-heart" label="התנדבות" onPress={() => router.push('/(user)/contact?tab=volunteer' as never)} />
          <QuickLink icon="account-search" label="חיפוש צוות" onPress={() => router.push('/(user)/contact?tab=teamFinder' as never)} />
          <QuickLink icon="information" label="מידע ותקנון" onPress={() => router.push('/(user)/info' as never)} />
          <QuickLink icon="heart-circle" label="מי אנחנו" onPress={() => router.push('/(user)/about' as never)} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!!events.links?.register && (
            <TouchableOpacity style={styles.donate} activeOpacity={0.85}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); Linking.openURL(events.links.register!); }}>
              <MaterialCommunityIcons name="clipboard-check" size={18} color="#fff" />
              <Text style={styles.donateTxt}>הרשמה למרוץ</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.donate} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); Linking.openURL(events.links.donate); }}>
            <MaterialCommunityIcons name="heart" size={18} color="#fff" />
            <Text style={styles.donateTxt}>{content.actions.donate}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wa} activeOpacity={0.85}
            onPress={() => router.push('/(user)/contact?tab=contact' as never)}>
            <MaterialCommunityIcons name="email" size={18} color={colors.forest} />
            <Text style={styles.waTxt}>יצירת קשר</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wa} activeOpacity={0.85}
            onPress={() => Linking.openURL(`https://wa.me/${events.links.whatsapp}`)}>
            <MaterialCommunityIcons name="whatsapp" size={18} color={colors.forest} />
            <Text style={styles.waTxt}>{content.actions.contact}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>{content.footer}</Text>
      </ScrollView>
    </View>
  );
}

function HeroStat({ num, label }: { num: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatNum} numberOfLines={1}>{num}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quick} activeOpacity={0.85} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}>
      <View style={styles.quickIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.forest} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FileLinks({ files }: { files: { gpx?: string; garmin?: string; israelHiking?: string } }) {
  const links = [
    { url: files.israelHiking, label: 'מפה', icon: 'map' as const },
    { url: files.garmin, label: 'Garmin', icon: 'watch' as const },
    { url: files.gpx, label: 'GPX', icon: 'download' as const },
  ].filter((l) => !!l.url);
  if (links.length === 0) return null;
  return (
    <View style={styles.fileLinks}>
      {links.map((l) => (
        <TouchableOpacity key={l.label} style={styles.fileBtn} activeOpacity={0.8}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); Linking.openURL(l.url!); }}>
          <MaterialCommunityIcons name={l.icon} size={13} color={colors.forest} />
          <Text style={styles.fileBtnTxt}>{l.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DetailRow({ icon, title, detail, extra }: { icon: any; title: string; detail: string; extra?: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}><MaterialCommunityIcons name={icon} size={16} color={colors.terracotta} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailSub}>{detail}</Text>
      </View>
      {!!extra && <Text style={styles.detailExtra}>{extra}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', writingDirection: 'rtl' },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.9, textAlign: 'center', marginTop: 4, writingDirection: 'rtl' },
  heroHeadline: { fontSize: 13, color: colors.gold, textAlign: 'center', marginTop: spacing.sm, fontWeight: '700', writingDirection: 'rtl' },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingVertical: spacing.md },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatNum: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: '#fff', opacity: 0.85, marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
  statusPill: { alignSelf: 'center', marginTop: spacing.md, backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill },
  statusTxt: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, marginHorizontal: spacing.lg },
  notice: { fontSize: 13, color: colors.danger, textAlign: 'center', fontWeight: '600', writingDirection: 'rtl', flexShrink: 1 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.md, marginHorizontal: spacing.md, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  imgWrap: { height: 160 },
  img: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  imgBadge: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  imgBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  body: { padding: spacing.md },
  cardDesc: { fontSize: 14, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: spacing.sm, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  detailIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  detailSub: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  detailExtra: { fontWeight: '800', color: colors.forest, fontSize: 13 },
  catStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: '#fdeee9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.sm },
  catStatusTxt: { color: colors.terracotta, fontWeight: '700', fontSize: 12 },
  reqRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
  reqTxt: { color: colors.ink, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  fileLinks: { flexDirection: 'row-reverse', gap: 6, marginTop: 4, marginBottom: 4, flexWrap: 'wrap' },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  fileBtnTxt: { color: colors.forest, fontWeight: '700', fontSize: 12 },
  teamRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  teamChip: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' },
  teamName: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  teamSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  teamPrice: { color: colors.terracotta, fontWeight: '800', marginTop: 2 },
  teamDesc: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  teamDescTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl', marginBottom: 2 },
  teamDescBody: { fontSize: 12, color: colors.muted, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  perks: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#fff8e6', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  perksTxt: { flex: 1, fontSize: 12, color: colors.ink, textAlign: 'right', writingDirection: 'rtl', lineHeight: 18 },
  water: { marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm },
  waterHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: spacing.xs },
  waterTitle: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  waterRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line },
  waterName: { flex: 1, fontSize: 13, color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  waterKm: { fontSize: 12, color: colors.muted, fontWeight: '700', minWidth: 52 },
  quickGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginHorizontal: spacing.md },
  quick: { width: '47%', flexGrow: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontWeight: '800', color: colors.ink, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  sectionH: { fontSize: 18, fontWeight: '900', color: colors.forest, textAlign: 'right', marginTop: spacing.lg, marginHorizontal: spacing.lg, writingDirection: 'rtl' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  schedTime: { fontWeight: '900', color: colors.terracotta, width: 70, fontSize: 13 },
  schedEvent: { fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  schedFrom: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl' },
  actions: { marginTop: spacing.lg, marginHorizontal: spacing.md, gap: spacing.sm },
  donate: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.terracotta, paddingVertical: 16, borderRadius: radius.pill },
  donateTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  wa: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.forest, paddingVertical: 16, borderRadius: radius.pill },
  waTxt: { color: colors.forest, fontWeight: '800', fontSize: 16 },
  footer: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl, fontSize: 12 },
});
