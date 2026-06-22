import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content } from '@/content';

export default function Login() {
  const { signInWithGoogle, signInAnon } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('שגיאת התחברות', e?.message ?? 'נסו שוב');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.forest, colors.deepGreen]} style={styles.container}>
      <Image source={require('../../assets/brand/trail-logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>{content.tagline}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>

      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <TouchableOpacity style={styles.googleBtn} onPress={() => run(signInWithGoogle)}>
              <Text style={styles.googleTxt}>התחברות עם Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.anonBtn} onPress={() => run(signInAnon)}>
              <Text style={styles.anonTxt}>כניסה כאורח/ת</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <Text style={styles.footer}>{content.footer}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logo: { width: 280, height: 120, marginBottom: spacing.lg, tintColor: '#fff' },
  tagline: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.sky, fontSize: 16, marginTop: spacing.sm, textAlign: 'center' },
  actions: { width: '100%', marginTop: spacing.xl, gap: spacing.md },
  googleBtn: { backgroundColor: '#fff', paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  googleTxt: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  anonBtn: { borderWidth: 1.5, borderColor: '#fff', paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center' },
  anonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.7)', fontSize: 12 },
});
