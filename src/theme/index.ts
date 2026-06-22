export { colors, valueTheme } from './colors';
export type { ValueKey } from './colors';
export { isRTL, rtlView, rtlText, rtlTextCenter } from './rtl';

export const fonts = {
  // Noto Sans Hebrew — the same family used by carmel-kinneret.org. Loaded via expo-font.
  bold: 'NotoSansHebrew-Bold',
  regular: 'NotoSansHebrew-Regular',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 };
