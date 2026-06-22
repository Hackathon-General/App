import he from './he.json';
import stationsData from './stations.json';
import eventsData from './events.json';
import routesData from './routes.json';

export const content = he;
export const stations = stationsData.stations;
export const events = eventsData;
export const routes = routesData;

export type Station = (typeof stationsData.stations)[number];
export type ValueKey = Station['value'];
