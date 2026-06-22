import { I18nManager, type TextStyle, type ViewStyle } from 'react-native';

/** True when the app is laid out right-to-left (forced on at app start). */
export const isRTL = I18nManager.isRTL;

/** Apply to any container that holds Hebrew content — forces RTL regardless of I18nManager state. */
export const rtlView: ViewStyle = { direction: 'rtl' };

/** Apply to Hebrew Text — right-aligned + RTL writing direction (works even if forceRTL didn't apply). */
export const rtlText: TextStyle = { textAlign: 'right', writingDirection: 'rtl' };

/** Centered Hebrew text (titles) that should still read RTL. */
export const rtlTextCenter: TextStyle = { textAlign: 'center', writingDirection: 'rtl' };
