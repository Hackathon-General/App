/**
 * Brand palette extracted from carmel-kinnertSite.html (the official site).
 * Terracotta + forest-green memorial trail identity.
 */
export const colors = {
  // Core brand
  terracotta: '#D68C45',
  forest: '#2C6E49',
  deepGreen: '#2A3C2C',
  mint: '#60D394',
  sky: '#A6E1F1',
  gold: '#FFCF56',

  // Neutrals
  ink: '#212121',
  white: '#FFFFFF',
  bg: '#FEF6ED', // warm cream background from the site
  muted: '#646464',
  line: '#F0F0F0',

  // Semantic
  danger: '#DF3131', // SOS / error
  success: '#0DC143',
} as const;

/** Value category → marker/chip color + icon (ערכי השביל). */
export const valueTheme: Record<
  string,
  { label: string; color: string; icon: string; tint: string }
> = {
  // Palette aligned to carmel-kinneret.org race pages. `tint` = light wash for selected states.
  loveOfLand:    { label: 'אהבת הארץ',  color: '#2C6E49', icon: 'leaf',          tint: '#EAF3EE' },
  justice:       { label: 'צדק',         color: '#FFCF56', icon: 'scale-balance', tint: '#FFF8E4' },
  volunteering:  { label: 'התנדבות',     color: '#D68C45', icon: 'hand-heart',    tint: '#FBF1E8' },
  helpingOthers: { label: 'עזרה לזולת',  color: '#FF8044', icon: 'heart',         tint: '#FFEFE7' },
  seeingOther:   { label: 'ראיית האחר',  color: '#A6E1F1', icon: 'eye',           tint: '#EDF8FC' },
  coexistence:   { label: 'קיום משותף',  color: '#60D394', icon: 'account-group', tint: '#EAF9F1' },
};

export type ValueKey = keyof typeof valueTheme;
