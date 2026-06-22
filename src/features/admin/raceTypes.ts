/** Full data model for a מירוץ (race/event) — covers every category & use case. */

export interface WalkRoute {
  name: string;
  km: number;
  start: string;
  finish: string;
  busDeparture?: string;
  difficulty?: string;
}

export interface RelayLeg {
  n: number;
  from: string;
  to: string;
  km: number;
  fromLat?: number; fromLng?: number;
  toLat?: number; toLng?: number;
}

export interface Team {
  name: string;       // זוגות / רביעיות / שמיניות
  runners: number;
  pricePerPerson: number;
}

export interface SubRace {
  name: string;       // אולטרה 92 / 55 / 33
  km: number;
  start?: string;
  startTime?: string;
  gain?: number;      // elevation +
  loss?: number;      // elevation -
  cutoff?: string;
  price?: number;
}

export interface Category {
  id: string;         // walk | relay | ultra | custom
  name: string;
  image?: string;
  description?: string;
  enabled?: boolean;
  // walk
  routes?: WalkRoute[];
  pricePerPerson?: number;
  // relay
  totalKm?: number;
  start?: string;
  startTime?: string;
  teams?: Team[];
  legs?: RelayLeg[];
  // ultra
  requirement?: string;
  subRaces?: SubRace[];
  perks?: string;
}

export interface ScheduleRow { time: string; event: string; from?: string }

export interface RaceEvent {
  name?: string;
  subtitle?: string;
  headline?: string;
  eventDate?: string;
  status?: 'open' | 'closed' | 'soon';
  registrationStatus?: string;
  notice?: string;
  finishArea?: { name?: string; opens?: string; closingCeremony?: string };
  registration?: { opens?: string; closes?: string };
  categories?: Category[];
  schedule?: ScheduleRow[];
  links?: { donate?: string; whatsapp?: string; site?: string; register?: string };
}

export const EMPTY_CATEGORY = (id: string): Category => ({ id, name: '', enabled: true });
export const EMPTY_LEG = (n: number): RelayLeg => ({ n, from: '', to: '', km: 0 });
export const EMPTY_TEAM = (): Team => ({ name: '', runners: 2, pricePerPerson: 0 });
export const EMPTY_SUBRACE = (): SubRace => ({ name: '', km: 0 });
export const EMPTY_ROUTE = (): WalkRoute => ({ name: '', km: 0, start: '', finish: '' });
