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
  { label: string; color: string; icon: string }
> = {
  loveOfLand:    { label: 'אהבת הארץ',  color: '#2C6E49', icon: 'leaf' },
  justice:       { label: 'צדק',         color: '#FFCF56', icon: 'scale-balance' },
  volunteering:  { label: 'התנדבות',     color: '#D68C45', icon: 'hand-heart' },
  helpingOthers: { label: 'עזרה לזולת',  color: '#EF6F53', icon: 'heart' },
  seeingOther:   { label: 'ראיית האחר',  color: '#A6E1F1', icon: 'eye' },
  coexistence:   { label: 'קיום משותף',  color: '#60D394', icon: 'account-group' },
};

export type ValueKey = keyof typeof valueTheme;
