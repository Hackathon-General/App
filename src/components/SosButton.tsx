import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '@/theme';
import { logSos } from '@/features/sos/sos';

/** Always-mounted floating SOS button → confirms, notifies the חמ"ל (admins), then dials 101. */
export function SosButton() {
  const onPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'מצוקה',
      'האם להתקשר ל-101 (מד״א)? צוות החמ״ל יקבל התראה עם מיקומך.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'חיוג 101',
          style: 'destructive',
          onPress: () => {
            // Log + notify admins (best-effort), then place the call regardless.
            logSos().catch(() => {});
            const url = Platform.OS === 'ios' ? 'telprompt:101' : 'tel:101';
            Linking.openURL(url).catch(() => Linking.openURL('tel:101'));
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} accessibilityLabel="כפתור מצוקה SOS">
      <Text style={styles.txt}>SOS</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 100, // clear of the bottom tab bar + home indicator
    left: 20,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 9999,
  },
  txt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
